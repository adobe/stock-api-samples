/**
 * https://github.com/jwtk/jjwt
 */

import java.security.Key;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.impl.crypto.MacProvider;

public class TestJWT {

	public static void main(String[] args) {
		// We need a signing key, so we'll create one just for this example. Usually
		// the key would be read from your application configuration instead.
		Key key = MacProvider.generateKey();
		
		String myClaim = "Christopher";
		String compactJws = Jwts.builder()
				.setSubject(myClaim)
				.signWith(SignatureAlgorithm.HS512, key)
				.compact();
		
		System.out.println(key);
		System.out.println(compactJws);
		
	}

}
