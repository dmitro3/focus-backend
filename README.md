# Getting Started

`npm install`
or
`yarn`

#### Run the Backend

1. First deploy the contracts to Testnet.
    - Check in contracts documentation
2. Create "Pinata" account here and specify the project details in .env (https://www.pinata.cloud/)
3. We need MongoDB
    - You can use MongoDB Atlas (https://docs.atlas.mongodb.com/getting-started/)
     or
    - Install MongoDB locally (https://docs.mongodb.com/guides/server/install/)
4. Configure the addresses of deployed contracts
    - Configure in .env (you can see the example in .env-example)
5. Run the backend
    - `node app.js`
