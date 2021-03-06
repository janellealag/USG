const express = require('express');
const router = express.Router();
const db = require('../../lib/database')();
const priceFormat = require('../cust-0extras/priceFormat');
const moment = require('moment');
const bcrypt = require('bcryptjs');
const saltRounds = 10;
const userTypeAuth = require('../cust-0extras/userTypeAuth');
const auth_cust = userTypeAuth.cust;
const pageLimit = 10;
const orderQuery = `SELECT tblorder.intStatus AS Status, IF(discountPrice IS NOT NULL, totalOriginalPrice-discountPrice, totalOriginalPrice)totalPrice,
  tblorder.*, (tblorder.shippingFee)shipping FROM tbluser INNER JOIN tblorder ON tbluser.intUserID= tblorder.intUserID INNER JOIN (
  SELECT SUM(purchasePrice*intQuantity)totalOriginalPrice, SUM(purchasePrice*discount*0.01*intQuantity)discountPrice,
  tblorder.intOrderNo FROM tblorder INNER JOIN tblorderdetails ON tblorder.intOrderNo= tblorderdetails.intOrderNo
  GROUP BY tblorder.intOrderNo )Price ON tblorder.intOrderNo= Price.intOrderNo WHERE tblorder.intUserID = ? `

function checkUser(req, res, next){
  if(!req.user){
    req.session.pendRoute = 1;
    req.flash('regSuccess', 'Login to view Account Information');
    res.redirect('/login');
  }
  else{
    req.session.pendRoute = 0;
    return next();
  }
}
function contactDetails (req, res, next){
  db.query(`SELECT * FROM tbluser
    INNER JOIN tblcustomer ON tbluser.intUserID= tblcustomer.intUserID
    WHERE tbluser.intUserID= ?`,[req.user.intUserID], (err, results, fields) => {
    if (err) console.log(err);
    req.contactDetails = results[0];
    return next();
  });
}
function locations (req, res, next){
  db.query(`SELECT strLocation FROM tblshippingfee WHERE intStatus= 1 ORDER BY strLocation`, (err, results, fields) => {
    if (err) console.log(err);
    req.locations = results;
    return next();
  });
}
function checkSignType (req, res, next){
  db.query(`SELECT intFacebook, intGoogle FROM tbluser WHERE intUserID= ?`, [req.user.intUserID], (err, results, fields) => {
    if (err) console.log(err);
    if (results[0]){
      if (results[0].intFacebook || results[0].intGoogle) req.checkSignType = 0
      else req.checkSignType = 1
    }
    else req.checkSignType = 1
    console.log(req.checkSignType)
    return next();
  });
}

router.get('/dashboard', checkUser, auth_cust, contactDetails, locations, checkSignType, (req,res)=>{
  sAddress =
    req.contactDetails.strShippingAddress ?
      req.locations.reduce((temp,data)=>{
        return data.strLocation == req.contactDetails.strShippingAddress.split(/\s-\s(.*)/g)[0] ? 1 : temp
      },0) : 1
  bAddress =
    req.contactDetails.strBillingAddress ?
      req.locations.reduce((temp,data)=>{
        return data.strLocation == req.contactDetails.strBillingAddress.split(/\s-\s(.*)/g)[0] ? 1 : temp
      },0) : 1

  res.render('cust-account/views/dashboard', {
    thisUser: req.user,
    thisUserContact: req.contactDetails,
    locations: req.locations,
    sAddress: sAddress,
    bAddress: bAddress,
    checkSignType: req.checkSignType
  });
});
router.get('/orders', checkUser, auth_cust, (req,res)=>{
  res.render('cust-account/views/orders', {thisUser: req.user});
});
router.get('/messages', checkUser, auth_cust, (req,res)=>{
  db.query(`SELECT * FROM tblmessages WHERE intCustomerID = ? ORDER BY intMessageNo DESC`,[req.user.intUserID], (err, results, fields) => {
    if (err) console.log(err);
    results[0] ? results.map( obj => obj.historyDate = moment(obj.historyDate).format('MM - DD - YYYY') ) : 0;
    db.query(`UPDATE tblmessages SET seenStatus= 1 WHERE seenStatus= 0 AND intCustomerID= ?`,
      [req.user.intUserID], (err, update, fields) => {
      if (err) console.log(err);
      res.render('cust-account/views/messages', {
        thisUser: req.user,
        messages: results
      });
    });
  });
});

router.post('/dashboard/info', checkUser, auth_cust, (req,res)=>{
  db.beginTransaction(function(err) {
    let saCity = req.body.dsaCity != 'Others' ? req.body.dsaCity : req.body.dsaOthers,
    baCity = req.body.dbaCity != 'Others' ? req.body.dbaCity : req.body.dbaOthers

    let fname = req.body.fname, mname = req.body.mname, lname = req.body.lname, email = req.body.email,
    dsa = `${saCity} - ${req.body.dsa}`, dba = `${baCity} - ${req.body.dba}`,
    phone = req.body.phone.replace(/-/g, ""), mobile = req.body.mobile

    req.body.sameAddress ? dba = dsa : 0

    if (err) console.log(err);
    db.query(`UPDATE tbluser SET strFname= ?, strMname= ?, strLname= ?, strEmail= ? WHERE intUserID= ?`,
      [fname, mname, lname, email, req.user.intUserID], (err, results, fields) => {
      if (err) console.log(err);
      db.query(`UPDATE tblcustomer SET strShippingAddress= ?, strBillingAddress= ?, strCusPhoneNo= ?, strCusMobileNo= ? WHERE intUserID= ?`,
        [dsa, dba, phone, mobile, req.user.intUserID], (err, results, fields) => {
        if (err) console.log(err);
        db.commit(function(err) {
          if (err) console.log(err);
          res.redirect('/account/dashboard');
        });
      });
    });
  });
});
router.post('/dashboard/password', checkUser, auth_cust, checkSignType, (req,res)=>{
  console.log(req.body)
  if (req.checkSignType){
    db.beginTransaction(function(err) {
      db.query(`SELECT strPassword FROM tbluser WHERE intUserID= ?`, [req.user.intUserID], (err, results, fields) => {
        if (err) console.log(err);
        bcrypt.compare(req.body.currentPass, results[0].strPassword, function(err, hashCompare) {
          if (hashCompare){
            if (req.body.newPass == req.body.confirmPass){
              bcrypt.hash(req.body.newPass, saltRounds, function(err, hash) {
                db.query(`UPDATE tbluser SET strPassword= ? WHERE intUserID= ?`,
                  [hash, req.user.intUserID], (err, results, fields) => {
                  if (err) console.log(err);
                  db.commit(function(err) {
                    if (err) console.log(err);
                    res.redirect('/account/dashboard');
                  });
                });
              });
            }
            else{
              res.render('cust-0extras/views/messagePage',{message: 'Password did not match', messBtn: `Dashboard`, messLink: `/account/dashboard`});
            }
          }
          else{
            res.render('cust-0extras/views/messagePage',{message: 'Current Password did not match', messBtn: `Dashboard`, messLink: `/account/dashboard`});
          }
        });
      });
    });
  }
  else{
    res.redirect('/account/dashboard');
  }
});

// ajax
router.post('/dashboard/checkInfo', checkUser, (req,res)=>{
  db.query(`SELECT strEmail FROM tbluser WHERE strEmail= ? AND intUserID!= ?`,
    [req.body.email, req.user.intUserID], (err, results, fields) => {
    if (err) console.log(err);
    if (results[0]){
      res.send({email: 'Email is taken'})
    }
    else{
      res.send({email: null})
    }
  });
});
router.post('/orders/load', checkUser, (req,res)=>{
  // ORDER BY intOrderNo DESC
  let config = {
    status: 'all',
    page: 1,
    total_pages: 1
  }
  config.page = req.body.page ?
    Number(req.body.page) ?
      parseInt(req.body.page)
      : 1
    : 1
  config.status = req.body.status ? req.body.status : 'all'

  let filterQuery = orderQuery;

  config.status ?
    config.status != 'all' ?
      filterQuery = filterQuery.concat(`AND intStatus = ${config.status} `) : 0
    : 0

  filterQuery = filterQuery.concat(`ORDER BY intOrderNo DESC `)

  db.beginTransaction(function(err) {
    if (err) console.log(err);
    db.query(`SELECT COUNT(C.intUserID)cnt FROM(${filterQuery})C`, [req.user.intUserID], function (err,  results, fields) {
      if (err) console.log(err);
      if(results[0]){
        config.total_pages =
          results[0].cnt >= pageLimit ?
            results[0].cnt % pageLimit ?
              Math.floor(results[0].cnt / pageLimit) + 1 :
            Math.floor(results[0].cnt / pageLimit)
          : 1
        config.page =
          config.page > config.total_pages ?
            config.total_pages :
            config.page < 1 ? 1 : config.page
        config.page =
          config.page > config.total_pages ?
            config.total_pages :
            config.page < 1 ?
              1 : config.page
      }
      // limit
      let start = 0;
      for(let i=0; i<config.page-1; i++){
        start += pageLimit;
      }
      limitQuery = filterQuery.concat(`LIMIT ${start},${pageLimit} `);
      // console.log(limitQuery)
      db.query(limitQuery, [req.user.intUserID], (err,results,fields)=>{
        if (err) console.log(err);
        if(results[0]){
          results.forEach((obj)=>{
            obj.dateOrdered = moment(obj.dateOrdered).format('LL');
            obj.totalPrice = priceFormat((parseFloat(obj.shipping)+parseFloat(obj.totalPrice)).toFixed(2));
          })
        }
        db.commit(function(err) {
          if (err) console.log(err);
          res.send({config: config, orders: results})
        });
      });
    });
  });
});

exports.account = router;
