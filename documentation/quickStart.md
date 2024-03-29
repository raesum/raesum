# Quick Start

To start a Raesum server instance:

1. Clone the repository
1. Run `npm install`
1. Create a PostgreSQL database
1. Create a `local.json` configuration file in the `config` directory. Note: You can use the `config/default.json` file as a template. You only need to declare settings that are different from the default settings.
1. Add PostgreSQL connection information to the `local.json` file.
1. Add the AWS region and connection information to the `local.json` file OR override all secret handling with the setting: `  "cloudBasedSecrets": []`
1. Run `npm run migrate` to create the database tables
1. Optional: Run `npm run seed` to seed the database with test data. Note: this will ERADICATE any existing data. DO NOT run this command on a production database.
1. Run `npm start` to start the server