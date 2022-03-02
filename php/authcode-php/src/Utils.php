<?php

namespace IMS {

    class Utils
    {
        private static $logPathRoot = '/../logs/router_~ID~.log';

        # returns unique log file name for that session
        protected static function getLogPath()
        {
            $lp = self::$logPathRoot;
            # add session name to log file
            $lp = str_replace('~ID~', session_id(), self::$logPathRoot);
            return $lp;
        }

        # generate csrf token to verify Ajax requests
        public static function getCSRF()
        {
            $csrfKey = Constants::$SVARS['CSRF'];
            # Check if a token is present for the current session
            if (!isset($_SESSION[$csrfKey])) {
                # No token present, generate a new one
                $token = bin2hex(random_bytes(64));
                # This value is added to response headers
                $_SESSION[$csrfKey] = $token;
            } else {
                # Reuse the token
                $token = $_SESSION[$csrfKey];
            }
            return $token;
        }

        # validates csrf
        public static function checkCSRF($code, $params = null)
        {
            $csrfKey = Constants::$SVARS['CSRF'];
            if (!is_null($code) && hash_equals($_SESSION[$csrfKey], $code)) {
                return true;
            } else {
                $ex = new \ValueError('CSRF token value does not match');
                Utils::debug($ex, 'ERROR');
                throw $ex;
            }
        }

        # cookie handling
        # clears session data and cookie storage
        public static function clearCookies()
        {
            # remove cookies
            foreach ($_COOKIE as $key => $val) {
                Utils::makeCookie($key, '', time() - 10000);
                Utils::debug("clearing cookie $key", 'logout');
            }
            # reset session vars
            session_destroy();
            /*
            $svars = Constants::$SVARS;
            foreach(array_keys($svars) as $key) {
                unset($_SESSION[$key]);
            }
            */
        }

        # stores cookie values
        public static function makeCookie($key, $val, $exp)
        {
            # setting samesite option as recommended
            # https://www.php.net/manual/en/function.setcookie.php#125242
            $arr_cookie_options = array(
                'expires' => $exp,
                'path' => '/',
                'domain' => $_SERVER['SERVER_NAME'],
                'secure' => true,
                'httponly' => true,
                'samesite' => 'None' // None || Lax  || Strict
            );
            setcookie($key, $val, $arr_cookie_options);
            # update COOKIE array
            $_COOKIE[$key] = $val;
        }

        #  get_current_uri strips the script name from URL
        #  ex: https://local.cfsdemos.com/stock/adobe.io/auth/token?code=12345
        #  will become /auth/token?code=12345
        #
        public static function get_current_uri()
        {
            $basepath = self::get_base_path();
            $uri = substr($_SERVER['REQUEST_URI'], strlen($basepath) + 1);
            Utils::debug($basepath, 'basepath');
            $query = '';
            if (strstr($uri, '?')) {
                $query = parse_url($uri, PHP_URL_QUERY);
                // $query = substr($uri, strpos($uri, '?'));
                $uri = substr($uri, 0, strpos($uri, '?'));
            }
            $url_array = array(
                'u' => $uri,
                'q' => $query
            );
            return $url_array;
        }

        # returns base path of script
        public static function get_base_path()
        {
            $path_arr = array_slice(explode('/', $_SERVER['SCRIPT_NAME']), 0, -1);
            # if /src is in path, remove it
            if ($path_arr[count($path_arr) - 1] == 'src') {
                $path_arr = array_slice($path_arr, 0, -1);
            }
            $basepath = implode('/', $path_arr);
            return $basepath;
        }

        # returns Referer value from header
        public static function get_referer($referVal)
        {
            $re = '/^https?:\/\/[^\/]+(\/[^?]+).*/';
            preg_match($re, $referVal, $match);
            $referer = ($referVal) ? $match[1] : null;
            return $referer;
        }

        # returns query params as array
        public static function get_query_params($query)
        {
            parse_str($query, $result);
            return $result;
        }

        # Uses Guzzle HTTP client to make requests
        # $params = ['locale' => 'en_US'];
        # $options = [
        #   'hostname' => 'stock.adobe.io',
        #   'params' => $params ];
        # $req = IMS\Utils::http_request($options);
        #
        public static function http_request($opt)
        {

            # create http client
            $client = new \GuzzleHttp\Client([
                'base_uri' => 'https://' . $opt->hostname,
                'timeout' => 5.0
            ]);

            # create request options
            $options = [
                'headers' => $opt->headers,
                'query' => $opt->params,
            ];

            # local proxy debugging
            if ($opt->chs_debug) {
                $options['proxy'] = [
                    'https' => 'tcp://127.0.0.1:8888'
                ];
                $options['verify'] = false;
            }
            try {
                # now add options and send request
                $response = $client->request($opt->method, $opt->path, $options);

                # check if an error is thrown
                $status = $response->getStatusCode();
                # get data from response and cast to string
                $data = (string)$response->getBody();

                if ($status >= 400) {
                    $msg = "$status $response->getReasonPhrase";
                    $body = json_decode($data);
                    Utils::debug($body, 'ERROR');
                    throw new \Exception($msg);
                    # is it fatal? 
                    # exit();
                }
                # assuming response is JSON
                return json_decode($data);
            } catch (\GuzzleHttp\Exception\ClientException $err) {
                self::debug($err, 'ERROR');
                throw new \Exception($err);
            }
        }

        # Ajax response handler
        public static function respond($msg, $status = 200)
        {
            $svars = Constants::$SVARS;
            $csrf = self::getCSRF();
            # refresh cookies to client
            foreach ($_SESSION as $key => $val) {
                if (!empty($val)) {
                    Utils::makeCookie($key, $val, '');
                }
            }
            header('Content-type:application/json;charset=utf-8');
            header("{$svars['CSRF']}: {$csrf}");
            http_response_code($status);
            if ($status >= 400) {
                echo json_encode([
                    'name' => 'ApplicationError',
                    'message' => $msg,
                    'code' => $status,
                ]);
            } else {
                echo json_encode($msg);
            }
        }

        # serves traffic to referer or outside destinations
        public static function redirect($url, $query)
        {
            $url .= (strstr($url, '?')) ? '&' : '?';
            $url .= $query;
            Utils::debug("redirecting: $url", 'redirect');
            # add csrf to header
            $csrfKey = Constants::$SVARS['CSRF'];
            $csrf = self::getCSRF();
            header("{$csrfKey}: {$csrf}");
            header("Location: $url");
            exit();
        }

        public static function clearLog()
        {
            $logPath = self::getLogPath();
            # does file exist and is writeable
            if (is_writable($logPath)) {
                unlink($logPath);
            }
        }

        # resets session data and reloads login page
        public static function doLogout()
        {
            $refer = (array_key_exists('HTTP_REFERER', $_SERVER)) ? Utils::get_referer($_SERVER['HTTP_REFERER']) : null;
            if (!isset($_SESSION['refer'])) {
                $_SESSION['refer'] = $refer;
            } else {
                $refer = $_SESSION['refer'];
            }
            self::clearCookies();
            self::redirect($refer, 'signed_in=false');
        }

        public static function debug($data, $tag = null)
        {
            # get backtrace 2 levels deep
            $bt = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 3);
            # extract class and line number of last function called
            $class = $bt[1]['class'];
            $line = $bt[0]['line'];
            $tags = ($tag) ? "$class:$line:$tag" : '';

            $console = $GLOBALS['CONSOLE'];

            # check if tag is "ERROR" and notify console
            if ($tag === 'ERROR') {
                # methods: https://github.com/barbushin/php-console/blob/master/src/PhpConsole/Handler.php
                $style = 'color: white; background: red';
                $msg = "%c{$tags}";
                $console::group($msg, $style);
                $console::error($data);
                $console::groupEnd($msg);
            } else {
                # call browser console debugging
                $style = 'color: white; background: blue';
                $msg = "%c{$tags}";
                $console::group($msg, $style);
                $console::log($data);
                $console::groupEnd($msg);
            }

            # get date and format for log file
            date_default_timezone_set('America/Los_Angeles');
            $ts = print_r(date(DATE_RFC2822), true);
            $output = print_r($data, true);
            # create log file if it doesn't exist
            # https://stackoverflow.com/a/62624579
            $logfile = realpath(__DIR__) . self::getLogPath();
            if (!file_exists($logfile)) {
                touch($logfile);
            }
            # send to log
            error_log("\n[$ts]\n$tags\n" . $output . "\n", 3, $logfile);
        }
    }
}
