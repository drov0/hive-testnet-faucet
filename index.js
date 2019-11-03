require("dotenv").config();
const steem = require('steem');
const bodyParser = require('body-parser')
const express = require('express');
const exphbs  = require('express-handlebars');

let chain_id = "0feb08c380aeb483b61a34cccb7271a3a99c47052bea529c4a891622f2c50d75";

steem.api.setOptions({url: 'https://testnet.steemitdev.com/', useAppbaseApi :  true, address_prefix : 'TST', 'chain_id' : chain_id});
steem.config.set('address_prefix', 'TST');
steem.config.set('chain_id', chain_id);

const app = express();

app.use(bodyParser.urlencoded());
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
app.use(express.static('public'));

function transfer(wif, from, to, amount)
{
    return new Promise(resolve => {

        steem.broadcast.transfer(wif, from, to, amount, "", function (err, result) {
            if (!err)
            {
                return resolve({status : "ok"})
            } else {
                return resolve({err : err})
            }
        });
    });
}

app.get('/', async function (req, res) {
    let ctx = {};
    let account = (await steem.api.callAsync('condenser_api.get_accounts', [[process.env.STEEM_USER]]))[0]

    ctx.tests = account.balance;
    ctx.chain_id = chain_id;

    res.render('home', ctx);
});

app.post('/', async function (req, res) {
    let ctx = {};

    let username = req.body.username;
    let account = (await steem.api.callAsync('condenser_api.get_accounts', [[process.env.STEEM_USER]]))[0];

    let result;
    if (parseFloat(account.balance) > 100) {
         result = await transfer(process.env.STEEM_ACTIVE, process.env.STEEM_USER, username, "5.000 TESTS");
    } else {
        result = {err : {message : "Faucet's balance can't go lower than 100 TESTS"} }
    }
    ctx.result = result.status === "ok";
    ctx.err = result.err !== undefined ? result.err.message : false;
    ctx.tests = account.balance;
    ctx.chain_id = chain_id;
    ctx.username = username;

    res.render('home', ctx);
});

app.listen(4000);