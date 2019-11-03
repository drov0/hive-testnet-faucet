require("dotenv").config();
const steem = require('steem');
const bodyParser = require('body-parser')
const express = require('express');
const exphbs  = require('express-handlebars');
let JsonDB  = require('node-json-db').JsonDB;
let Config = require('node-json-db/dist/lib/JsonDBConfig').Config

var jsondb = new JsonDB(new Config("db", true, false, '/'));

let chain_id = process.env.CHAIN_ID;

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

    ctx.tests = account.balance;
    ctx.chain_id = chain_id;
    ctx.username = username;

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
                ctx.err = "You already reach the claim limit of 50 TESTS tokens in 6 hours, please try again after a few hours";
                return  res.render('home', ctx);
            }
        } else
        {
            // reset claimed count
            user_data = undefined;
        }
    }

    let result;
    if (parseFloat(account.balance) > 100) {
        result = await transfer(process.env.STEEM_ACTIVE, process.env.STEEM_USER, username, "5.000 TESTS");
    } else {
        result = {err : {message : "Faucet's balance can't go lower than 100 TESTS"} }
    }

    if (result.status === "ok")
    {
        if (user_data === undefined)
            jsondb.push("/"+username, {time : new Date().getTime()/1000, claimed : 5});
        else {
            user_data.claimed += 5;
            jsondb.push("/"+username, user_data);
        }
        ctx.result = true;
        ctx.tests = (parseFloat(ctx.tests) - 5) + " TESTS";
    }


    ctx.err = result.err !== undefined ? result.err.message : false;

    res.render('home', ctx);
});

app.listen(4000);