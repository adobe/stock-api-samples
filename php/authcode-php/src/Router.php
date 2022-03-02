<?php

namespace { # global namespace

use IMS\Utils;

#composer class loader
    require realpath(__DIR__) . '/../vendor/autoload.php';

    # example from https://www.php.net/manual/en/function.session-status.php#123404
    if (session_status() !== PHP_SESSION_ACTIVE) {
       # reset logs
       Utils::clearLog();
       # set session cookie name
       session_name(IMS\Constants::$SVARS['NAME']);
       # sets default session cookie options
       $arr_cookie_options = [
        'lifetime' => 0,
        'path' => '/',
        'domain' => $_SERVER['SERVER_NAME'], 
        'secure' => true,
        'httponly' => true,
        'samesite' => 'None' // None || Lax  || Strict
       ];
       session_set_cookie_params($arr_cookie_options);
       session_start();
       Utils::getCSRF();
    }

    # register Chrome logger
    $CONSOLE = \ChromePhp::getInstance();

    # include config vars
    # require './auth_config.php';
    $AUTH_CONFIG = new IMS\Config();

    # 'start' router instance
    $IMS_ROUTER = IMS\Router::getInstance();
}

namespace IMS {

    #  Manages routes and redirects to appropriate script
    #  Use in combination with .htaccess
    #  http://blogs.shephertz.com/2014/05/21/how-to-implement-url-routing-in-php/
    #
    class Router
    {

        # create Singleton instance
        private static $instance = null;

        #  Whitelisted route endpoints
        private static $endpoints = array(
            'auth' => 'IMS\AuthCode',
            'profile' => 'IMS\Profile',
        );

        # stores current route and parameters
        protected $routes = array();
        protected $query_params = array();

        #  constructor causes URI to be stored in $routes array
        #  $routes[0] will correspond to first route.
        #  Ex: $routes[0] is 'auth', $routes[1] is 'token'
        #
        private function __construct()
        {
            # get URI path
            $url_array = Utils::get_current_uri();
            Utils::debug($url_array, 'url_array');
            $base_url = $url_array['u'];
            $query = $url_array['q'];
            $temp_routes = explode('/', $base_url);
            $routes_idx = 0;
            foreach ($temp_routes as $route) {
                if (trim($route) != '') {
                    array_push($this->routes, $route);
                    $routes_idx++;
                }
            }
            if ($query != '') {
                Utils::debug("query: $query", 'query');
                $this->query_params = Utils::get_query_params($query);
            } else {
                $this->query_params = array();
            }

            # Check if endpoint is registered, and create object to handle it
            $dest = $this->routes[0];
            if (array_key_exists($dest, self::$endpoints)) {
                try {
                    # check if csrf is in header and if so, add to query params
                    $csrfKey = Constants::$SVARS['CSRF'];
                    # get csrf value and cast to string if not null
                    if (isset(getallheaders()[$csrfKey])) {
                        $csrf = (trim(strtolower(strval(getallheaders()[$csrfKey]))));
                    }
                    # add as query param if it is not null
                    if (!empty($csrf) && ctype_alnum($csrf) && $csrf !== 'null') {
                        $this->query_params[$csrfKey] = $csrf;
                    }

                    # TODO: Relocate this logic to Utils, and only call on some endpoints
                    # check for csrf value and validate before allowing to continue to protected routes
                    /*
                    $csrfKey = Constants::$SVARS['CSRF'];
                    if (array_key_exists($csrfKey, $this->query_params)) {
                        $checkCode = $this->query_params[$csrfKey];
                    } else {
                        # throw exception
                        $checkCode = null;
                    }
                    Utils::checkCSRF($checkCode, $this->query_params);
                    */
                    $auth_type = self::$endpoints[$dest];
                    Utils::debug('Routing to ' . $auth_type, 'auth_type');
                    # Create instance of route handler (AuthCode or Profile)
                    new $auth_type($this->routes, $this->query_params);
                } catch (\Exception $err) {
                    Utils::debug($err->getMessage(), 'ERROR');
                    # sign out user in ui and remove data
                    # TODO: Fix this:
                    #   Currently signing out with every request because of csrf
                    #   If login is called, need to start new session
                    #   If token is called, check if from IMS and skip csrf
                    # see https://www.oauth.com/oauth2-servers/signing-in-with-google/authorization-request/
                    #
                    Utils::doLogout();
                }
            } elseif ($dest == '') {
                # redirect to index if route is blank
                Utils::redirect('./index.php', null);
            } else {
                http_response_code(404);
                header($_SERVER["SERVER_PROTOCOL"] . " 404 Not Found");
                $msg = '<h1>404</h1><p>Page not found.</p>';
                echo $msg;
                Utils::debug($this->routes, 'ERROR');
                exit();
            }
        }

        public static function getInstance()
        {
            if (self::$instance == null) {
                Utils::debug('Router created', 'router');
                self::$instance = new Router();
            }
            Utils::debug('Router instance returned', 'router');
            return self::$instance;
        }
    }
}
