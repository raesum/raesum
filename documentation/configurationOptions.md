# Configuration Options

Elphaba has several configuration options that can be set in the `config` folder. The following is a list of all the available options and their default values.

The syntax and structure of the configuration is an extension of the [Config](https://www.npmjs.com/package/config) package on NPM.

Note: The `default.json` contains the default value and an example of EVERY setting.

## Key Differences from `config`

The Raesum Config system has two key differences from the stock config package that it sits on top of:

- The `get()` method must ALWAYS be called asynchronously. It does not support synchronous calls.
- The AWS secrets manager is supported for storage of secrets either individually or in multi-key json objects.

## AWS Secrets Manager

When in production sensitive keys should NOT be stored in physical files on the server. Instead they should be stored in the AWS secrets manager. To have Raesum use the secrets manager, the following steps should be taken:

1. Create a secret in the AWS secrets manager.
2. Add the secret name to the `cloudBasedSecrets` array in the configuration files. Use the full dot notation of the secret.
3. Store the secret key id as the value of the secret in the configuration file. This is the key that Raesum will use to retrieve the secret from the AWS secrets manager.

Note: for local testing, you can override the `cloudBasedSecrets` array in the `local.json` file to force loading of the secrets from the local file.

## Configuration Options

### server

This section controls how the raseum server operates.

- `port` (number) - The port that the server will listen on. Default: 3000
- `host` (string) - The host that the server assumes it can be accessed on. It is used to build urls to the system. If a load balancer is present, this should be the address of the load balancer / external domain name. Default: localhost
- `protocol` (string) - The protocol that the server assumes it can be accessed on. It is used to build urls to the system. Raesum assumes that SSL is terminated on the load balancer or proxy and does not directly offer SSL. This value will be used whenever links or redirects need to be built. Default: http
- `proxyInUse` (boolean) - If the server is behind a proxy, this should be set to true. This will affect whether the server uses the `port` or `proxyPort` setting when building links to Raesum. Default: false
- `proxyPort` (number) - The port that the proxy is listening on. This is used to build urls to the system when the server is behind a proxy. Default: 443

### CORS

- `allowedOrigins` (array) - An array of strings that represent the allowed origins for CORS. Default: []

### Session

This section controls the session configuration for session-based authentication.

- `type` (string) - The type of session store to use. Options: `memory`, `redis`. Default: `memory`
- `appName` (string) - The name of the application used for session identification. Default: `raesum`
- `secret` (string) - The secret key used to sign the session cookie. This should be changed from the default in production. Default: `changeThisFromDefault`
- `sessionMaximumAgeSeconds` (number) - The maximum age of a session in seconds. Default: `864000`

### Rate Limiter

This section controls the rate limiting configuration for API requests.

- `useRateLimiter` (boolean) - Whether to enable rate limiting. Default: `true`
- `type` (string) - The type of rate limiter to use. Options: `memory`, `redis`. Default: `memory`
- `pointsPerSecond` (number) - The number of requests allowed per second per IP address. Default: `200`
- `blockDurationMinutes` (number) - The duration in minutes that an IP address is blocked when the rate limit is exceeded. Default: `15`
- `pathWeights` (object) - Custom weights for specific API paths. Paths with higher weights consume more points per request. Default: see below
    - `/api/v1/auth/login` (number) - Weight for login endpoint. Default: `20`
    - `/api/v1/auth/callbackSession` (number) - Weight for session callback endpoint. Default: `20`
    - `/api/v1/auth/callbackJWT` (number) - Weight for JWT callback endpoint. Default: `20`

### initialization

This section is used when the server is started for the FIRST time. It will create the first user in the system which should be a superadmin. It will also create the user in Cognito. -`firstUserExternalId` (string) - The cognito id of the first user in the system. The user should already exist in cognito.

- `firstUserUsername` (string) - The username of the first user in the system.
- `firstUserRole` (string) - This is the role to assign to the user. It should be a superadmin role but can be overriden. Note: If you don't have a superadmin you will need to MANUALLY create one later if one is needed.
- `firstUserEmail` (string) - The email address of the first user in the system. Default: `odin@raesum.com`
- `firstUserPassword` (string) - The password for the first user in the system. This should be changed from the default in production. Default: `changeThisFromDefault`
- `autoMigrate` (boolean) - Whether to automatically run database migrations during initialization. When enabled, the system will run all pending migrations before checking if the system is initialized. This is useful for development and testing environments. Default: `false`

### login

This section controls what login types/patterns are allowed. One or both may be enabled.

- `jwt` (boolean) - Whether to allow JWT for authentication. Default: true
- `useSessionCookie` (boolean) - Whether to allow session cookies for authentication. If using this be sure to completely configure the session in a secure way. Default: false
- `allowedPostLoginURIs` (array) - An array of strings that represent the allowed post-login URIs. These should be full qualified domain names with protocols (ie `https://example.com`). These are only used for sessionCookie type authentication. Default: []

### Cache

Raesum supports multiple potential cache backends. For a multi-server deployment, it's _STRONGLY_ recommended to use Redis. For a single server deployment or local development, the in-memory cache may be sufficient (Redis is still suggested where possible).

Note - certain sensitive pieces of data, such as AWS secrets do NOT use the central caching system and are stored in memory only outside of the central cache and are not subject to TTL. They clear when the system is restarted.

- `type` (string) - The cache backend to use. Options: `memory`, `redis`. Default: `memory`
- `ttl` (number) - The number of seconds a key is kept in cache. Default: 500
- `prefix` (string) - A prefix to add to all keys in the cache. Default: `raesum_cache_`

### Connections

This section controls the connections to the database and other external services.

#### PrimaryDatabase

This is the configuration to a PostgreSQL database. Any setting with a value of null, will NOT be sent to the PostgreSQL client. This is to allow the client to use its default settings - see [PG-Pool](https://www.npmjs.com/package/pg-pool) for details.

- `host` (string) - The host of the database. If none is set, the PostgreSQL client will attempt to connect to localhost. Default: `null`
- `port` (number) - The port of the database. Default: `5432`
- `database` (string) - The name of the database. Default: `raesum`
- `credentials` (object) - The credentials to use to connect to the database. Note: If no credentials are set, the PostgreSQL client will attempt to connect without a username or password which will often rely on PAM or similar system authentication.
    - `username` (string) - The username to use to connect to the database. Default: `null`
    - `password` (string) - The password to use to connect to the database. Default: `null`
- `ssl` (object) - The SSL settings to use to connect to the database. If no settings are set, the PostgreSQL client will attempt to connect without SSL. Default: `null`
- `maxPoolSize` (number) - The maximum number of clients to allow in the pool. Default: `20`
    - `timeouts` (object) - The timeouts to use for the pool.
        - `clientForceTimeout` (number) - The number of milliseconds to wait for a client to connect to the database. Default: `15000`
        - `idleTimeout` (number) - The number of milliseconds to wait for a client to be idle before it is removed from the pool. Default: `1000`
        - `connectionTimeout` (number) - The number of milliseconds to wait for a connection to be established. Default: `1000`
        - `maxUses` (number) - The maximum number of times a client can be used before it is removed from the pool. Default: `7500`

#### Session

This section governs the Redis connection for session storage when `session.type` is set to `redis`.

##### Redis

- `host` (string) - The host of the Redis server. If none is set, the Redis client will attempt to connect to localhost. Default: `null`
- `port` (number) - The port of the Redis server. Default: `6379`
- `connectTimeout` (number) - The number of milliseconds to wait for a connection to be established. Default: `10000`
- `databaseNumber` (number) - The database to use on the Redis server. Default: `1`
- `credentials` (object) - The credentials to use to connect to the server. If both are not set, they will be ignored.
    - `username` (string) - The username to use to connect to the server. Default: `null`
    - `password` (string) - The password to use to connect to the server. Default: `null`

#### Cache

This section governs the specific connections to the cache servers. Note - any settings that apply to cache irrespective of what type of cache is used is stored in the `cache` section of the configuration.

Note: The `memory` configuration stanza is not used. It is included for completeness.

##### Redis

- `host` (string) - The host of the Redis server. If none is set, the Redis client will attempt to connect to localhost. Default: `null`
- `port` (number) - The port of the Redis server. Default: `6379`
- `connectTimeout` (number) - The number of milliseconds to wait for a connection to be established. Default: `10000`
- `databaseNumber` (number) - The database to use on the Redis server. Default: `0`
- `credentials` (object) - The credentials to use to connect to the server. If both are not set, they will be ignored.
    - `username` (string) - The username to use to connect to the server. Default: `null`
    - `password` (string) - The password to use to connect to the server. Default: `null`

#### Rate Limiter

This section governs the Redis connection for rate limiting when `ratelimiter.type` is set to `redis`.

##### Redis

- `host` (string) - The host of the Redis server. If none is set, the Redis client will attempt to connect to localhost. Default: `null`
- `port` (number) - The port of the Redis server. Default: `6379`
- `connectTimeout` (number) - The number of milliseconds to wait for a connection to be established. Default: `10000`
- `databaseNumber` (number) - The database to use on the Redis server. Default: `2`
- `credentials` (object) - The credentials to use to connect to the server. If both are not set, they will be ignored.
    - `username` (string) - The username to use to connect to the server. Default: `null`
    - `password` (string) - The password to use to connect to the server. Default: `null`

### Logging

The logging system supports multiple outputs (transports): file, console, and AWS CloudWatch (coming soon). Each transport can be enabled separately.

- `level` (string) - The level of logging to use. Options: `critical`,`error`, `warning`, `info`, `verbose`, `debug`. For production systems, the suggested level is `info`. Default: `debug`
- `logsEnabled` - Determines which log outputs are enabled
    - `console` (boolean) - Whether to log to the console. Default: `true`
    - `file` (boolean) - Whether to log to a file. Default: `true`
- `filePath` (string) - The path to the file to log to. This can be either a relative or absolute file path on the server. Default: `logs`
- `filename` (string) - The name of the file to log to. Default: `app.log`

### developmentAndTesting

This section contains settings for development and testing environments.

#### developmentMode

- `developmentMode` (boolean) - Whether the server is running in development mode. This may enable additional debugging features or relaxed security settings. Default: `false`

#### integrationTestEnabled

The automated tests may require external resources for certain tests (such as the redis-based cache). This section controls whether these tests are run.

- `redis` (boolean) - Whether to run tests that require a Redis server. The tests will use the appropriate settings in `connections` Default: `true`
- `aws` (boolean) - Whether to run tests that require AWS services. Default: `false`
- `primaryDatabase` (boolean) - Whether to run tests that require the primary database. Default: `false`

#### seed

This section governs the seeder that is used to populate the database with test data. This is used for both development and automated testing.

- `scaleFactor` (number) - The scale factor to use when generating test data. This is a multiplier that is applied to the base data set. USE WITH CAUTION as a large number can easily overload a test system. Default: `1`
- `createInCognito` (boolean) - Whether to create the test data in a separate schema. Do not combine this with a high scale factor as it will quickly generate AWS charges. Do not turn this on unless you are SURE it is needed and have appropriate scaleFactor settings. Default: `false`
- `seedRoles` - Determines the roles to use for different sample users. All three must be valid role keys.
    - `orgAdmin` (string) - The role key to use for the admin user for a specific organization.
    - `orgManager` (string) - This role is for an organization 'manager'. It should have fewer powers than the admin user.
    - `baseUser` (string) - This role is for a standard user in an organization. It should have the fewest powers of the three.

### AWS

This section contains the settings for AWS services.

- `region` (string) - The region to use for AWS services. Default: `us-east-1`
- `accessKeyId` (string) - The access key to use for AWS services. For production systems it is _STRONGLY_ recommended to use IAM roles assigned to the application server instead of keys. Default: `null`
- `secretAccessKey` (string) - The secret access key to use for AWS services. Default: `null`
- `cognito` - This is the cognito pool configuration. It is used to connect to the cognito pool for user management.
    - `userPoolId` (string) - The id of the cognito user pool. Default: `null`
    - `cognitoClientId` (string) - The client id of the cognito user pool. Default: `null`
    - `tokenExpiration` (number) - The number of seconds that a token is valid for. Default: `3600000`
    - `enableTokenRevocation` (boolean) - Whether to enable token revocation functionality. Default: `true`
- `s3` - This section contains the S3 bucket configurations for different file storage purposes.
    - `public` - Configuration for the public S3 bucket where files are publicly accessible.
        - `bucketName` (string) - The name of the S3 bucket. Default: `localhost-public`
        - `baseUrl` (string) - The base URL for accessing files in this bucket. Default: `null`
        - `keyPrefix` (string) - A prefix to add to all keys in this bucket. Default: `null`
    - `quarantine` - Configuration for the quarantine S3 bucket where potentially malicious files are isolated.
        - `bucketName` (string) - The name of the S3 bucket. Default: `localhost-quarantine`
        - `baseUrl` (string) - The base URL for accessing files in this bucket. Default: `null`
        - `keyPrefix` (string) - A prefix to add to all keys in this bucket. Default: `null`
    - `private` - Configuration for the private S3 bucket where files are secured and require authentication to access.
        - `bucketName` (string) - The name of the S3 bucket. Default: `localhost-private`
        - `baseUrl` (string) - The base URL for accessing files in this bucket. Default: `null`
        - `keyPrefix` (string) - A prefix to add to all keys in this bucket. Default: `null`

### cloudBasedSecrets

This section contains an array of configuration paths that should be retrieved from AWS Secrets Manager instead of being stored in the configuration files. This is used for sensitive information like database credentials.

- `cloudBasedSecrets` (array) - An array of strings representing the dot-notation paths to configuration values that should be retrieved from AWS Secrets Manager. Each value in the configuration file should be the secret name/key in AWS Secrets Manager. Default: `["connections.primaryDatabase.credentials"]`

### newUserDefaults

This section contains default values that should be applied when creating new users in the system.

- `activeStatus` (boolean) - The default active status for new users. Default: `true`
- `currentOrganizationId` (number) - The default organization ID to assign to new users. Default: `1`
