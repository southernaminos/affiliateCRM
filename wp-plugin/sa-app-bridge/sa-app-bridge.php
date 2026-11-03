<?php
/**
 * Plugin Name:       Southern Aminos App Bridge
 * Description:       Lets the Southern Aminos mobile app hand a signed-in customer and their cart to the website's checkout and My Account pages.
 * Version:           1.0.0
 * Requires PHP:      7.4
 * Requires Plugins:  woocommerce
 * Author:            Southern Aminos
 * License:           GPL-2.0-or-later
 *
 * How it works:
 *  1. The app (signed in with a JWT) calls POST /wp-json/sa-app/v1/web-session with its cart lines.
 *  2. This plugin returns a one-time link (valid 2 minutes) that the app opens in its in-app browser.
 *  3. Opening the link signs the customer into the website, rebuilds the cart, and redirects to the
 *     checkout (or My Account). Payment then runs through the store's normal gateway.
 */

defined( 'ABSPATH' ) || exit;

final class SA_App_Bridge {
	const TOKEN_TTL    = 120;
	const MAX_ITEMS    = 100;
	const MAX_COUPONS  = 10;
	const VIEW_COOKIE  = 'sa_app_view';
	const DESTINATIONS = array( 'checkout', 'orders', 'account' );

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
		add_action( 'init', array( __CLASS__, 'handle_login_link' ), 1 );
		add_action( 'wp_loaded', array( __CLASS__, 'handle_cart_fill' ), 20 );
		add_action( 'wp_head', array( __CLASS__, 'embedded_styles' ) );
		add_filter( 'rest_allowed_cors_headers', array( __CLASS__, 'allowed_cors_headers' ) );
		add_filter( 'rest_exposed_cors_headers', array( __CLASS__, 'exposed_cors_headers' ) );
	}

	// ----- REST: create a one-time web session link -----

	public static function register_routes() {
		register_rest_route(
			'sa-app/v1',
			'/web-session',
			array(
				'methods'             => 'POST',
				'permission_callback' => static function () {
					return is_user_logged_in();
				},
				'callback'            => array( __CLASS__, 'create_web_session' ),
				'args'                => array(
					'destination' => array(
						'type'     => 'string',
						'enum'     => self::DESTINATIONS,
						'required' => true,
					),
					'items'       => array(
						'type'    => 'array',
						'default' => array(),
						'items'   => array(
							'type'       => 'object',
							'properties' => array(
								'id'       => array( 'type' => 'integer', 'minimum' => 1 ),
								'quantity' => array( 'type' => 'integer', 'minimum' => 1 ),
							),
						),
					),
					'coupons'     => array(
						'type'    => 'array',
						'default' => array(),
						'items'   => array( 'type' => 'string' ),
					),
					'embedded'    => array(
						'type'    => 'boolean',
						'default' => true,
					),
				),
			)
		);
	}

	public static function create_web_session( WP_REST_Request $request ) {
		$items = array();
		foreach ( array_slice( (array) $request['items'], 0, self::MAX_ITEMS ) as $item ) {
			$id  = isset( $item['id'] ) ? absint( $item['id'] ) : 0;
			$qty = isset( $item['quantity'] ) ? absint( $item['quantity'] ) : 0;
			if ( $id && $qty ) {
				$items[] = array( 'id' => $id, 'quantity' => min( $qty, 9999 ) );
			}
		}

		$coupons = array_values(
			array_filter(
				array_map( 'wc_format_coupon_code', array_slice( (array) $request['coupons'], 0, self::MAX_COUPONS ) )
			)
		);

		$token = self::store_token(
			'login',
			array(
				'user_id'     => get_current_user_id(),
				'destination' => $request['destination'],
				'items'       => $items,
				'coupons'     => $coupons,
				'embedded'    => (bool) $request['embedded'],
			)
		);

		return rest_ensure_response( array( 'url' => add_query_arg( 'sa_app_login', $token, home_url( '/' ) ) ) );
	}

	// ----- Step 1: one-time link signs the customer in -----

	public static function handle_login_link() {
		if ( empty( $_GET['sa_app_login'] ) ) {
			return;
		}
		nocache_headers();
		$data = self::consume_token( 'login', wp_unslash( $_GET['sa_app_login'] ) ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- hashed, never output.
		$user = $data ? get_user_by( 'id', $data['user_id'] ) : false;
		if ( ! $user ) {
			wp_safe_redirect( wc_get_page_permalink( 'myaccount' ) );
			exit;
		}

		wp_clear_auth_cookie();
		wp_set_current_user( $user->ID );
		wp_set_auth_cookie( $user->ID, false, is_ssl() );

		if ( ! empty( $data['embedded'] ) ) {
			// Session cookie; it lives only in the app's in-app browser.
			setcookie( self::VIEW_COOKIE, '1', 0, COOKIEPATH ? COOKIEPATH : '/', COOKIE_DOMAIN, is_ssl(), true );
		}

		// The cart has to be rebuilt on the next request, once WooCommerce has loaded the customer's session.
		$fill = self::store_token( 'fill', $data );
		wp_safe_redirect( add_query_arg( 'sa_app_fill', $fill, home_url( '/' ) ) );
		exit;
	}

	// ----- Step 2: rebuild the cart and go to the destination -----

	public static function handle_cart_fill() {
		if ( empty( $_GET['sa_app_fill'] ) || ! function_exists( 'WC' ) ) {
			return;
		}
		nocache_headers();
		$data = self::consume_token( 'fill', wp_unslash( $_GET['sa_app_fill'] ) ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- hashed, never output.
		if ( ! $data || get_current_user_id() !== (int) $data['user_id'] ) {
			wp_safe_redirect( wc_get_page_permalink( 'myaccount' ) );
			exit;
		}

		if ( 'checkout' === $data['destination'] ) {
			if ( null === WC()->cart && function_exists( 'wc_load_cart' ) ) {
				wc_load_cart();
			}
			$cart = WC()->cart;
			$cart->empty_cart();
			foreach ( $data['items'] as $item ) {
				$product = wc_get_product( $item['id'] );
				if ( ! $product ) {
					continue;
				}
				if ( $product->is_type( 'variation' ) ) {
					$cart->add_to_cart( $product->get_parent_id(), $item['quantity'], $product->get_id(), $product->get_variation_attributes() );
				} else {
					$cart->add_to_cart( $product->get_id(), $item['quantity'] );
				}
			}
			foreach ( $data['coupons'] as $code ) {
				$cart->apply_coupon( $code );
			}
			$cart->calculate_totals();
			WC()->session->set_customer_session_cookie( true );
			$target = wc_get_checkout_url();
		} elseif ( 'orders' === $data['destination'] ) {
			$target = wc_get_account_endpoint_url( 'orders' );
		} else {
			$target = wc_get_page_permalink( 'myaccount' );
		}

		wp_safe_redirect( $target );
		exit;
	}

	// ----- Inside the app, hide the site header/footer on checkout and account pages -----

	public static function embedded_styles() {
		if ( empty( $_COOKIE[ self::VIEW_COOKIE ] ) ) {
			return;
		}
		if ( ! ( is_checkout() || is_account_page() || is_order_received_page() ) ) {
			return;
		}
		/**
		 * CSS selectors hidden when a page is shown inside the app. Return an empty array to disable.
		 */
		$selectors = apply_filters(
			'sa_app_bridge_hidden_selectors',
			array( '#masthead', '.site-header', 'header.wp-block-template-part', '#colophon', '.site-footer', 'footer.wp-block-template-part' )
		);
		if ( $selectors ) {
			echo '<style id="sa-app-bridge">' . esc_html( implode( ',', $selectors ) ) . '{display:none!important}</style>';
		}
	}

	// ----- CORS for the web build of the app -----

	public static function allowed_cors_headers( $headers ) {
		return array_unique( array_merge( $headers, array( 'Authorization', 'Nonce', 'Cart-Token' ) ) );
	}

	public static function exposed_cors_headers( $headers ) {
		return array_unique( array_merge( $headers, array( 'Nonce', 'Cart-Token', 'X-WP-Total', 'X-WP-TotalPages' ) ) );
	}

	// ----- One-time tokens (only a hash is stored) -----

	private static function store_token( $purpose, array $data ) {
		$token = bin2hex( random_bytes( 32 ) );
		set_transient( self::token_key( $purpose, $token ), $data, self::TOKEN_TTL );
		return $token;
	}

	private static function consume_token( $purpose, $token ) {
		if ( ! is_string( $token ) || ! preg_match( '/^[a-f0-9]{64}$/', $token ) ) {
			return null;
		}
		$key  = self::token_key( $purpose, $token );
		$data = get_transient( $key );
		delete_transient( $key );
		return is_array( $data ) ? $data : null;
	}

	private static function token_key( $purpose, $token ) {
		return 'sa_app_' . $purpose . '_' . substr( hash( 'sha256', $token ), 0, 40 );
	}
}

SA_App_Bridge::init();
