# Login Methods

Raesum natively supports several different login scenarios via two authentication methods: JWT and Session Cookies.

## The Role of AWS Cognito

AWS Cognito's primary role is authentication NOT authorization in Raesum. Raesum uses the cognito hosted UI to authanticate users.

## Scenarios

### Login from web app on separate or same domain using JWT

1. Ensure that JWT is enabled as a login type in the Raesum configuration.
2. Configure the web app as a valid redirect in Cognito configuration.
3. Redirect the user to /api/v1/login?redirect_uri=URL_ENCODED_REDIRECT_URI
   - The redirect_uri is the URI that the user will be redirected to after they have logged in from the AWS UI. It will default to `/api/v1/loggedIn` if not set. It is recommended to pass the web application's URI here.
4. After the user logs in, they will be redirected back to the web application with the query string paramater `code`
5. Post a request to /api/v1/getJWT with the code. The JWT will be returned in the response.

### Login from web app on same domain using session cookies

1. Ensure that session cookies are enabled as a login type in the Raesum configuration.
2. Ensure that sessions have been *SECURELY* configured in the Raesum configuration.
3. Configure the raesum api server is running in /api/ of the web application on the same domain as the web application.
4. Redirect the user to /api/v1/login?redirect_uri=URL_ENCODED_REDIRECT_URI&post_login_uri=URL_ENCODED_POST_LOGIN_URI
   - (optional) The post_login_uri is the URI that the user is starting the login process from. 
     - This can be used to support login from any page on a web application. It will default to "/" if not set.
     - This url MUST be the same domain as Raesum OR be a domain set in the allowedOrigins for CORS
   - The redirect_uri is the URI that the user will be redirected to after they have logged in from the AWS UI. It will default to `/api/v1/loggedIn` if not set.
5. The user will be cookied for their session and their session will be stored in the Raesum session store as logged in.

## Logout

### Login from web app on separate or same domain using JWT


### Login from web app on same domain using session cookies
1. Ensure that session cookies are enabled as a login type in the Raesum configuration.
2. Ensure that sessions have been *SECURELY* configured in the Raesum configuration.
3. Configure the raesum api server is running in /api/ of the web application on the same domain as the web application.
4. Call the /api/v1/logout endpoint. The user will be logged out and their session will be destroyed. They will be redirected to '/'.

## Notes

The `/api/v1/loggedIn` endpoint will ONLY show the user as logged in if the session cookie login approach is enabled. When using session cookie logins, the user will be tagged upon login and will be unable to retrieve JWTs (which will be stored server-side).  JWTs can ONLY be retrieved from the /api/v1/getJWT endpoint if the user has logged in via the JWT login approach.

```