# Configuration Options

Elphaba has several configuration options that can be set in the `config` folder. The following is a list of all the available options and their default values.

The syntax and structure of the configuration is an extension of the [Config](https://www.npmjs.com/package/config) package on NPM.

Note: The `default.json` contains the default value and an example of EVERY setting.

## Key Differences from `config`

The Raesum Config system has two key differences from the stock config package that it sits on top of:

* The `get()` method must ALWAYS be called asynchronously. It does not support synchronous calls.
* The AWS secrets manager is supported for storage of secrets either individually or in multi-key json objects.

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

### Cache

Raesum supports multiple potential cache backends. For a multi-server deployment, it's *STRONGLY* recommended to use Redis. For a single server deployment or local development, the in-memory cache may be sufficient (Redis is still suggested where possible).

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

#### Cache

This section governs the specific connections to the cache servers. Note - any settings that apply to cache irrespective of what type of cache is used is stored in the `cache` section of the configuration.

Note: The `memory` configuration stanza is not used. It is included for completeness.

##### Redis 
`redis` (object) - The configuration to connect to a Redis server. Any setting with a value of null, will NOT be sent to the Redis client. This is to allow the client to use its default settings - see [ioredis](https://www.npmjs.com/package/ioredis) for details.

Any of the connection settings supported by [ioredis](https://www.npmjs.com/package/ioredis) can be used here except: "lazyConnect","retryStrategy","tls". These have been set by Raesum and cannot be saved in the configuration file.

  - `host` (string) - The host of the Redis server. If none is set, the Redis client will attempt to connect to localhost. Default: `null`
  - `port` (number) - The port of the Redis server. Default: `6379`
  - `password` (string) - The password to use to connect to the Redis server. Default: `null`
  - `databaseNumber` (number) - The database to use on the Redis server. Default: `0`
  - `connectTimeout` (number) - The number of milliseconds to wait for a connection to be established. Default: `1000`
  - `credentials` (object) - The credentials to use to connect to the server. If both are not set, they will be ignored.
      - `username` (string) - The username to use to connect to the server. Default: `null`
      - `password` (string) - The password to use to connect to the server. Default: `null`

### Logging

The logging system supports multiple outputs (transports): file, console, and AWS CloudWatch (coming soon). Each transport can be enabled separately.

- `level` (string) - The level of logging to use. Options: `critical`,`error`, `warning`, `info`, `debug`, `verbose`. For production systems, the suggested level is `info`. Default: `debug`
- `logsEnabled` - Determines which log outputs are enabled
  - `console` (boolean) - Whether to log to the console. Default: `true`
  - `file` (boolean) - Whether to log to a file. Default: `true`
- `filePath` (string) - The path to the file to log to. This can be either a relative or absolute file path on the server. Default: `logs`
- `filename` (string) - The name of the file to log to. Default: `app.log`

### IntegrationTestsEnabled

The automated tests may require external resources for certain tests (such as the redis-based cache). This section controls whether these tests are run.

- `redis` (boolean) - Whether to run tests that require a Redis server. The tests will use the appropriate settings in `connections` Default: `true`

### AWS

This section contains the settings for AWS services. 

- `region` (string) - The region to use for AWS services. Default: `us-east-1`
- `accessKeyId` (string) - The access key to use for AWS services. For production systems it is *STRONGLY* recommended to use IAM roles assigned to the application server instead of keys. Default: `null`
- `secretAccessKey` (string) - The secret access key to use for AWS services. Default: `null`