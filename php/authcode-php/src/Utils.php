<?php

namespace IMS {

    class Utils
    {

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

      # now add options and send request
            $response = $client->request($opt->method, $opt->path, $options);
      
      # get data from response and cast to string
            $data = (string)$response->getBody();
      # assuming response is JSON
            return json_decode($data);
        }

        public static function clearCookies()
        {
            # reset session
            $_SESSION['refer'] = null;
            # remove cookies
            foreach ($_COOKIE as $key => $val) {
                setcookie($key, '', time()-10000, '/', $_SERVER['SERVER_NAME'], true, true);
                Utils::debug("clearing cookie $key", 'logout');
            }
        }

        public static function redirect($url, $query)
        {
            $url .= (strstr($url, '?')) ? '&' : '?';
            $url .= $query;
            Utils::debug("redirecting: $url", 'redirect');
            header("Location: $url");
            exit;
        }

        public static function debug($data, $tag = null)
        {
      # get backtrace one level deep
            $bt = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 1);
      # extract line number of last function called
            $line = $bt[0]['line'];
            $tags = ($tag) ? "$line:$tag" : '';
      # call PC debugging
            \PhpConsole\Handler::getInstance()->debug($data, $tags);
      // get date and format
            date_default_timezone_set('America/Los_Angeles');
            $ts = print_r(date(DATE_RFC2822), true);
            $output = print_r($data, true);
            $logfile = realpath(__DIR__) . '/../logs/router.log';
      # send to log
            error_log("\n[$ts]\n$tags\n" . $output . "\n", 3, $logfile);
        }
    }

}
