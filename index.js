require("dotenv").config();
const hive = require('@hiveio/hive-js');
const bodyParser = require('body-parser');
const express = require('express');
const exphbs  = require('express-handlebars');
let JsonDB  = require('node-json-db').JsonDB;
let Config = require('node-json-db/dist/lib/JsonDBConfig').Config;

var jsondb = new JsonDB(new Config("db", true, false, '/'));

let chain_id = process.env.CHAIN_ID;

hive.api.setOptions({url: process.env.TESTNET_API_URL, address_prefix : 'TST', 'chain_id' : chain_id});
hive.config.set('address_prefix', 'TST');
hive.config.set('chain_id', chain_id);

const app = express();

app.use(bodyParser.urlencoded());
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
app.use(express.static('public'));

function transfer_tokens(wif, from, to, amount)
{
    return new Promise(resolve => {
        const ops = [];

        ops.push(['transfer', {
            from,
            to,
            amount: `${amount} TBD`,
            memo: "Enjoy your faucet tokens :)"
        }]);
        ops.push(['transfer', {
            from,
            to,
            amount: `${amount} TESTS`,
            memo: "Enjoy your faucet tokens :)"
        }]);

        hive.broadcast.send({operations: ops, extensions: []}, {posting: wif}, async function (err) {
            if (!err) {
                return resolve({status : "ok"})
            } else {
                return resolve({err : err})
            }
        });

    });
}

app.get('/', async function (req, res) {
    let ctx = {};
    let account = (await hive.api.callAsync('condenser_api.get_accounts', [[process.env.HIVE_USER]]))[0];

    ctx.tests = account.balance;
    ctx.tbd = account.hbd_balance;
    ctx.chain_id = chain_id;
    ctx.given_tokens = process.env.AMOUNT_GIVEN;
    ctx.testnet_api_url = process.env.TESTNET_API_URL;

    res.render('home', ctx);
});

app.post('/', async function (req, res) {
    let ctx = {};

    let username = req.body.username;
    let account = (await hive.api.callAsync('condenser_api.get_accounts', [[process.env.HIVE_USER]]))[0];

    ctx.tests = account.balance;
    ctx.tbd = account.hbd_balance;
    ctx.chain_id = chain_id;
    ctx.username = username;
    ctx.given_tokens = process.env.AMOUNT_GIVEN;
    ctx.testnet_api_url = process.env.TESTNET_API_URL;

    let user_data;

    try {
        user_data = jsondb.getData("/" + username);
    } catch (e) {

    }

    if (user_data !== undefined)
    {
        // if it has been less than 6 hours since the last claim
        if (((new Date().getTime()/1000 - user_data.time) < 28800)) {
            if (user_data.claimed > 50)
            {
                ctx.err = "You already reach the claim limit of 50 tokens in 6 hours, please try again after a few hours";
                return  res.render('home', ctx);
            }
        } else
        {
            // reset claimed count
            user_data = undefined;
        }
    }

    let result;
    if (parseFloat(account.balance) > 100 && parseFloat(account.hbd_balance) > 100) {
        result = await transfer_tokens(process.env.HIVE_ACTIVE, process.env.HIVE_USER, username, process.env.AMOUNT_GIVEN);
    } else {
        result = {err : {message : "Faucet's balance can't go lower than 100 TESTS or TBD"} }
    }

    if (result.status === "ok")
    {
        if (user_data === undefined)
            jsondb.push("/"+username, {time : new Date().getTime()/1000, claimed : parseFloat(process.env.AMOUNT_GIVEN)});
        else {
            user_data.claimed += parseFloat(process.env.AMOUNT_GIVEN);
            jsondb.push("/"+username, user_data);
        }
        ctx.result = process.env.AMOUNT_GIVEN;
        ctx.tests = (parseFloat(ctx.tests) - parseFloat(process.env.AMOUNT_GIVEN)) + " TESTS";
        ctx.tbd = (parseFloat(ctx.tbd) - parseFloat(process.env.AMOUNT_GIVEN)) + " TBD";
    }


    ctx.err = result.err !== undefined ? result.err.message : false;

    res.render('main', ctx);
});

app.listen(4000);
