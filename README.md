# Hive Testnet Faucet

This website allows you to claim testnet tokens. Keep in mind that those tokens are worthless! They are only here for testing purposes
Input your username and you will recieve 5 TESTS (equivalent of HIVE on the testnet).

## Installing 

`npm install`

then create a .env file containing these fields :
```
CHAIN_ID=testnet_chain_id
HIVE_USER=you_faucet_account
HIVE_ACTIVE=your_faucet_account_active_key
```
## Running it

You can run it using you favorite process manager, I like pm2 :

`pm2 start index.js --name faucet`
