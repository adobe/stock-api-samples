<?php

namespace { # global namespace

    session_start(); // tracks referer

  #composer class loader
    require realpath(__DIR__) . '/../vendor/autoload.php';
  
  # catch errors in console
    $console_handler = PhpConsole\Handler::getInstance();
    $console_handler->start();

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

        # Check if endpoint is registered, and create object
            if (array_key_exists($this->routes[0], self::$endpoints)) {
                $auth_type = self::$endpoints[$this->routes[0]];
                Utils::debug('Routing to ' . $auth_type, 'auth_type');
        # Create instance of route handler (AuthCode or Profile)
                $ims = new $auth_type($this->routes, $this->query_params);
            } elseif ($this->routes[0] == '') {
                # redirect to index if route is blank
                header('Location: ./index.php');
            } else {
                header($_SERVER["SERVER_PROTOCOL"] . " 404 Not Found");
                $msg = 'Page not found.';
                echo "<pre>$msg</pre>";
                throw new \Exception($msg);
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
