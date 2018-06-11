/**
 * Creates IMS JWT using https://github.com/jwtk/jjwt
 */
package com.adobe.stock.adobeio;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.KeySpec;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Date;

import com.adobe.stock.adobeio.config.AppConfig;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.SignatureException;
import io.jsonwebtoken.impl.DefaultClaims;
import io.jsonwebtoken.impl.DefaultJwtParser;

public class ImsJwtToken {

	private static Long expirationTime = 86400L * 1000; // 24 hours in milliseconds
	// https://stackoverflow.com/a/3588445 / Convert Long to 24 hours from now
	private static Date expirationDate = new Date(new Date().getTime() + 1 * expirationTime);
	private static String audienceFmt = "https://%s/c/%s";
	private static String scopeFmt = "https://%s/s/%s";
	private static RSAPrivateKey privateKey;
	
	/**
	 * Adapted from 
	 * https://www.adobe.io/apis/cloudplatform/console/authentication/createjwt/jwt_java.html
	 * @throws IOException 
	 * @throws InvalidKeySpecException 
	 * @throws NoSuchAlgorithmException 
	 */
	public static String getJwt(AppConfig config) throws IOException, NoSuchAlgorithmException, InvalidKeySpecException {
		String path = Thread.currentThread().getContextClassLoader().getResource("").getPath();
		byte[] privateKeyBytes = getKeyFromDER(path + config.privKeyFilename);
		privateKey = generateKey(privateKeyBytes);
		DefaultClaims jwtClaims = new DefaultClaims();
		jwtClaims.setIssuer(config.orgId);
		jwtClaims.setSubject(config.techAcct); 
		jwtClaims.setExpiration(expirationDate);
		jwtClaims.setAudience(String.format(audienceFmt, config.imsHost, config.apiKey));
		for (String scope : config.scopes) {
			jwtClaims.put(String.format(scopeFmt, config.imsHost, scope), true);
		}
		String jwtString = Jwts.builder()
				.setClaims(jwtClaims)
				.signWith(SignatureAlgorithm.RS256, privateKey)
				.compact();
		return jwtString;
	}
	
	public static String parseJwt(String token) throws ExpiredJwtException, MalformedJwtException, SignatureException {
		// checks validity
		DefaultJwtParser jwtp = new DefaultJwtParser();
		jwtp.setSigningKey(privateKey);
		String jwtString = jwtp.parse(token).toString();
		return jwtString;
	}
	
	private static RSAPrivateKey generateKey(byte[] keyBytes) throws NoSuchAlgorithmException, InvalidKeySpecException {
		KeyFactory keyFactory = KeyFactory.getInstance("RSA");
		KeySpec ks = new PKCS8EncodedKeySpec(keyBytes);
		RSAPrivateKey privateKey = (RSAPrivateKey) keyFactory.generatePrivate(ks);
		return privateKey;
	}
	
	private static byte[] getKeyFromDER(String filename) throws IOException {
		// workaround for Windows
		File file = new File(filename).getAbsoluteFile();
		// System.out.println(file.toPath().toString());
		byte[] privateKeyBytes = Files.readAllBytes(file.toPath());
		return privateKeyBytes;
	}
	
}
