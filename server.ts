// magic incantations
// "\program files\mongodb\server\3.2\bin\mongod"
// "\program files\mongodb\server\3.2\bin\mongorestore" --db matchdb --drop matchdb
// set DEBUG=express:* & node server.js
// set NODE_ENV=development& node server.js
// set NODE_ENV=production& node server.js

import * as http from "http";
import * as url from "url";
import * as express from "express";
import * as bodyParser from "body-parser";
import errorHandler = require("errorhandler");
import methodOverride = require("method-override");

import { amLogin, amProposalHead, amProposal, amProfile, amUpdateProfile, amVote, amPost, amCite } from "./ui/src/classes";
import * as db from "./db";

function getjwt(req: express.Request): string {
    let auth = req.headers['authorization'];
    if (auth)
        return auth.slice('Bearer'.length + 1);
    else
        return null;
}

function handle_error(res: express.Response, e: Error) {
    if (typeof (e) == "string") {
        res.status(401);
        res.send(e);
    }
    else {
        res.status(500);
        res.send("Internal server error " + e);
    }
    console.error(e);
}


db.init().catch(err => {
    console.error("Database init failed, exiting", err);
    process.exit(1);
});

let app = express();
app.enable('trust proxy');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(errorHandler());

app.get('/heads', (req, res) => {
    res.json(db.getHeads());
});

app.get('/proposals', (req, res) => {
    res.redirect("/"); // virtual path redirect (maybe a bookmark)
});

app.get('/profile', (req, res) => {
    res.redirect("/"); // virtual path redirect (maybe a bookmark)
});

app.get('/login', (req, res) => {
    res.redirect("/"); // virtual path redirect (maybe a bookmark)
});

app.get('/proposal/:id', (req, res) => {
    let token = getjwt(req);
    if (token == null)
        res.redirect("/");
    else
        db.getProposal(req.params.id).then(proposal => res.json(proposal)).catch(e => handle_error(res, e));
});

app.get('/profile/:sn', (req, res) => {
    let token = getjwt(req);
    if (token == null)
        res.redirect("/");
    else
        db.getProfile(token, req.params.sn).then(profile => res.json(profile)).catch(e => handle_error(res, e));
});

app.get('/votes/:sn', (req, res) => {
    db.getVotes(req.params.sn).then(votes => res.json(votes)).catch(e => handle_error(res, e));
});

app.get('/posts/:sn', (req, res) => {
    db.getPosts(req.params.sn).then(posts => res.json(posts)).catch(e => handle_error(res, e));
});

app.get('/cites/:sn', (req, res) => {
    db.getCites(req.params.sn).then(cites => res.json(cites)).catch(e => handle_error(res, e));
});

app.get('/matches/:pid', (req, res) => {
    let token = getjwt(req)
    if (token)
        db.getMatchVotes(token, req.params.pid).then(matches => res.json(matches)).catch(e => handle_error(res, e));
    else {
        res.status(401);
        res.send({});
    }
});

app.get('/unsubscribe/:id', (req, res) => {
    db.unsubscribe(req.params.id).then(message => res.send(message)).catch(e => handle_error(res, e));
});

app.delete('/profile/:sn', (req, res) => {
    let token = getjwt(req)
    if (token)
        db.deleteSn(token, req.params.sn).then(message => res.send(message)).catch(e => handle_error(res, e));
    else {
        res.status(401);
        res.send({});
    }
});

app.put('/profile', (req, res) => {
    let token = getjwt(req);
    if (token == null)
        res.redirect("/");
    else
        db.setProfile(token, req.body as amProfile).then(retval => res.send(retval)).catch(e => handle_error(res, e));
});

app.put('/update', (req, res) => {
    let token = getjwt(req);
    if (token == null)
        res.redirect("/");
    else
        db.updateProfile(token, req.body as amUpdateProfile).then(retval => res.send(retval)).catch(e => handle_error(res, e));
});

app.put('/proposal', (req, res) => {
    let token = getjwt(req);
    if (token == null)
        res.redirect("/");
    else
        db.setProposal(token, req.body as amProposal).then(retval => res.send(retval)).catch(e => handle_error(res, e));
});

app.post('/flag', (req, res) => {
    db.flag(getjwt(req), req.body as amPost).then(retval => res.send(retval)).catch(e => handle_error(res, e));
});

app.post('/vote', (req, res) => {
    db.vote(getjwt(req), req.ip, req.body as amVote).then(retval => res.send(retval)).catch(e => handle_error(res, e));
});

app.post('/post', (req, res) => {
    db.post(getjwt(req), req.body as amPost).then(retval => res.send(retval)).catch(e => handle_error(res, e));
});

app.post('/cite', (req, res) => {
    db.cite(getjwt(req), req.body as amCite, true).then(retval => res.send(retval)).catch(e => handle_error(res, e));
});

app.post('/uncite', (req, res) => {
    db.cite(getjwt(req), req.body as amCite, false).then(retval => res.send(retval)).catch(e => handle_error(res, e));
});

app.post('/exists', (req, res) => {
    db.exists(req.body as amLogin).then(b => res.send(b)).catch(e => handle_error(res, e));
});

// does both log in and registration, depending on whether amLogin has an email address
app.post('/login', (req, res) => {
    let token = getjwt(req);
    if (token == null)
        res.redirect("/");
    else
        db.login(token, req.body as amLogin)
            .then(retval => {
                if (!retval)
                    res.status(401);
                res.send(retval);
            })
            .catch(e => handle_error(res, e));
});

if (app.settings.env === 'development') {
    app.get('/', function (req, res, next) {
        res.sendFile(__dirname + '/ui/debug-index.html')
    });
    app.use(express.static(__dirname + '/ui/src'));
}
else {
    app.get('/', function (req, res, next) {
        res.sendFile(__dirname + '/ui/bundle-index.html')
    });

    app.get('*.js', function (req, res, next) {
        req.url = req.url + '.gz';
        res.set('Content-Encoding', 'gzip');
        next();
    });

    app.get('*.html', function (req, res, next) {
        req.url = req.url + '.gz';
        res.set('Content-Encoding', 'gzip');
        next();
    });

    app.get('*.css', function (req, res, next) {
        req.url = req.url + '.gz';
        res.set('Content-Encoding', 'gzip');
        res.set('Content-Type', 'text/css');
        next();
    });
}

app.use(express.static(__dirname));
app.use(express.static(__dirname + '/ui'));

app.get('*', (req, res) => {
    console.error(new Date(), req.ip, "404 on URL", req.url);
    res.sendFile(__dirname + '/ui/404.html')
});

app.listen(80, function () {
    console.log("proxyfor.me server listening on port %d in %s mode", 80, app.settings.env);
});