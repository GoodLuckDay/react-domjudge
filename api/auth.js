const router = require('express').Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

const crypto = require('crypto');

// It chould be changed by DOMJudge's hashing algorithm
const hash_password = (username, password) => crypto.createHash('md5').update(username + '#' + password).digest('hex');

router.post('/login', (req, res) => {
  (async function(req, res) {
    const secret = req.app.get('jwt-secret');
    const data = req.body;
    try{
      let users = await db.user.getByUsername(data.username);
      if (users.length !== 1) throw new Error('no_user');
      let user = users[0];
      if (user.password !== hash_password(user.username, data.password)) throw new Error('wrong_password');
      
      let teams = await db.team.getByTeamId(user.teamid);
      if (teams.length !== 1) throw new Error('no_team');
      let team = teams[0];

      let affils = await db.affiliation.getByAffilId(team.affilid);
      let affiliation = affils.length === 1 ? affils[0] : null;
      let userdata = {
        username: user.username,
        name: user.name,
        teamname: team.name,
        affiliation: affiliation
      };
      const token = jwt.sign(userdata, secret, {
        expiresIn: req.app.get('jwt-expire'),
        issuer: req.app.get('jwt-issuer')
      });

      let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      db.user.login(user.username, ip);
      // TODO: update teampage first visit
      res.send({
        success: true,
        userdata,
        token
      });
    } catch (error) {
      res.send({
        success: false,
        error: error.message
      });
    }
  })(req, res);
});

router.get('/user', (req, res) => {
  res.json(req.user);
});

module.exports = router;
