var router = require('express').Router();
var db = require('../../lib/database')();
var moment = require('moment');
const userTypeAuth = require('../cust-0extras/userTypeAuth');
const auth_cons = userTypeAuth.cons;

router.get('/',(req,res)=>{
  db.query(`Select * from tblConsignorRequest where intConsignorNo = "${req.user.intUserID}"`,(err1,res1,fie1)=>{
    if(err1) console.log(err1);
    else{
      res.render('cons-requests/views/cons-requests',{re: res1, moment: moment})
    }
  })
})

exports.consRequests = router;