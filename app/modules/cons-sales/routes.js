const express = require('express');
const router = express.Router();
const db = require('../../lib/database')();
const priceFormat = require('../cust-0extras/priceFormat');
const userTypeAuth = require('../cust-0extras/userTypeAuth');
const auth_cons = userTypeAuth.cons;
const pageLimit = 2;
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function sizeString(obj){
  let curSize = ``;
  obj.strVariant ? curSize+= `${obj.strVariant}`: 0
  obj.strVariant && obj.intSize ? curSize+= ` - `: 0
  obj.intSize ? curSize+= `${obj.intSize}`: 0
  obj.strUnitName ? curSize+= ` ${obj.strUnitName}`: 0
  return curSize;
}

function checkUser(req, res, next){
  if(!req.user){
    res.redirect('/login');
  }
  else{
    return next();
  }
}
function monthsAvailable(req,res,next){
  db.query(`SELECT MONTH(tblorderhistory.historyDate)month, monthname(tblorderhistory.historyDate)monthname FROM tblproductlist
    INNER JOIN tblproductinventory ON tblproductlist.intProductNo= tblproductinventory.intProductNo
    INNER JOIN tblorderdetails ON tblproductinventory.intInventoryNo= tblorderdetails.intInventoryNo
    INNER JOIN tblorder ON tblorderdetails.intOrderNo= tblorder.intOrderNo
    INNER JOIN tblorderhistory ON tblorderhistory.intOrderNo= tblorder.intOrderNo
    WHERE tblproductinventory.intUserID= ? AND tblorderhistory.intStatus= 3 GROUP BY month`,
    [req.user.intUserID], (err, results, fields) => {
    if (err) console.log(err);
    req.monthsAvailable= results;
    return next();
  });
}
function yearsAvailable(req,res,next){
  db.query(`SELECT YEAR(tblorderhistory.historyDate)year FROM tblproductlist
    INNER JOIN tblproductinventory ON tblproductlist.intProductNo= tblproductinventory.intProductNo
    INNER JOIN tblorderdetails ON tblproductinventory.intInventoryNo= tblorderdetails.intInventoryNo
    INNER JOIN tblorder ON tblorderdetails.intOrderNo= tblorder.intOrderNo
    INNER JOIN tblorderhistory ON tblorderhistory.intOrderNo= tblorder.intOrderNo
    WHERE tblproductinventory.intUserID= ? AND tblorderhistory.intStatus= 3 GROUP BY year`,
    [req.user.intUserID], (err, results, fields) => {
    if (err) console.log(err);
    req.yearsAvailable= results;
    return next();
  });
}

router.get('/', checkUser, auth_cons, (req,res)=>{
  res.render('cons-sales/views/index',{
    thisUser: req.user
  });
});

router.post('/loadSales', monthsAvailable, yearsAvailable, (req,res)=>{
  let sCountCurrent, sCountPrevious, sProducts, sInv, limitQuery,
  config = {
    page: 1,
    total_pages: 1,
    filterBy: req.body.filterBy,
    curSel: 'This Week',
    prevSel: 'Previous Week',
    months: req.monthsAvailable,
    years: req.yearsAvailable
  }
  req.body.filterBy == 'specialDate' ?
    req.monthsAvailable[0] ?
      req.monthsAvailable.reduce((temp, month)=>{
        console.log(temp)
        return month.month == req.body.month ? 1 : temp
      },0) ?
        0 :
        req.body.month == 'All' ?
          0 :
          config.filterBy = 'thisWeek'
      : config.filterBy = 'thisWeek'
    : 0
  req.body.filterBy == 'specialDate' ?
    req.yearsAvailable[0] ?
      req.yearsAvailable.reduce((temp, year)=>{
        console.log(temp)
        return year.year == req.body.year ? 1 : temp
      },0) ?
        0 : config.filterBy = 'thisWeek'
      : config.filterBy = 'thisWeek'
    : 0
  switch (config.filterBy) {
    case 'thisWeek':
      sDate = 'WEEK(tblorderhistory.historyDate)= WEEK(CURDATE())';
      sDatePrev = `${sDate}-1`;
      break;
    case 'thisMonth':
      sDate = 'MONTH(tblorderhistory.historyDate)= MONTH(CURDATE())';
      sDatePrev = `${sDate}-1`;
      config.curSel = 'This Month';
      config.prevSel = 'Previous Month';
      break;
    case 'thisYear':
      sDate = 'YEAR(tblorderhistory.historyDate)= YEAR(CURDATE())';
      sDatePrev = `${sDate}-1`;
      config.curSel = 'This Year';
      config.prevSel = 'Previous Year';
      break;
    default:
      if(req.body.month == 'All'){
        sDate = `YEAR(tblorderhistory.historyDate)= ${req.body.year}`;
        sDatePrev = `${sDate}-1`;
        config.curSel = `Year ${req.body.year}`;
        config.prevSel = 'Previous Year';
      }
      else{
        sDateMonth = `MONTH(tblorderhistory.historyDate)= ${req.body.month} `;
        sDateYear = `AND YEAR(tblorderhistory.historyDate)= ${req.body.year}`;
        sDate = `${sDateMonth} ${sDateYear}`;
        sDatePrev = `${sDateMonth}-1 ${sDateYear}`;
        config.curSel = `${monthNames[req.body.month-1]} ${req.body.year}`;
        config.prevSel = 'Previous Month';
      }
      break;
  }
  config.page = req.body.page ?
    Number(req.body.page) ?
      parseInt(req.body.page)
      : 1
    : 1

  let productsQuery = `SELECT tblproductlist.intProductNo, tblproductbrand.strBrand, tblproductlist.strProductName, tblproductlist.strProductPicture, tblorderhistory.historyDate,
    SUM(tblorderdetails.intQuantity)QtySold, SUM(purchasePrice*tblorderdetails.intQuantity)TotalPrice FROM tblproductlist
    INNER JOIN tblproductbrand ON tblproductlist.intBrandNo= tblproductbrand.intBrandNo
    INNER JOIN tblproductinventory ON tblproductlist.intProductNo= tblproductinventory.intProductNo
    INNER JOIN tblorderdetails ON tblproductinventory.intInventoryNo= tblorderdetails.intInventoryNo
    INNER JOIN tblorder ON tblorderdetails.intOrderNo= tblorder.intOrderNo
    INNER JOIN tblorderhistory ON tblorderhistory.intOrderNo= tblorder.intOrderNo
    WHERE tblproductinventory.intUserID= ? AND tblorderhistory.intStatus= 3 AND ${sDate}
    GROUP BY tblproductlist.intProductNo ORDER BY tblproductlist.intProductNo `

  fsalesCountCurrent();
  function fsalesCountCurrent(){
    db.query(`SELECT SUM(tblorderdetails.intQuantity)QtySold, SUM(purchasePrice*tblorderdetails.intQuantity)TotalPrice FROM tblproductlist
      INNER JOIN tblproductinventory ON tblproductlist.intProductNo= tblproductinventory.intProductNo
      INNER JOIN tblorderdetails ON tblproductinventory.intInventoryNo= tblorderdetails.intInventoryNo
      INNER JOIN tblorder ON tblorderdetails.intOrderNo= tblorder.intOrderNo INNER JOIN tblorderhistory ON tblorderhistory.intOrderNo= tblorder.intOrderNo
      WHERE tblproductinventory.intUserID= ? AND tblorderhistory.intStatus= 3 AND ${sDate}`,
      [req.user.intUserID], (err, results, fields) => {
      if (err) console.log(err);
      if (results[0]){
        results[0].TotalPrice ? results[0].TotalPrice = priceFormat(results[0].TotalPrice.toFixed(2)) : 0
      }
      sCountCurrent = results
      fsalesCountPrevious();
    });
  }
  function fsalesCountPrevious(){
    db.query(`SELECT SUM(tblorderdetails.intQuantity)QtySold, SUM(purchasePrice*tblorderdetails.intQuantity)TotalPrice FROM tblproductlist
      INNER JOIN tblproductinventory ON tblproductlist.intProductNo= tblproductinventory.intProductNo
      INNER JOIN tblorderdetails ON tblproductinventory.intInventoryNo= tblorderdetails.intInventoryNo
      INNER JOIN tblorder ON tblorderdetails.intOrderNo= tblorder.intOrderNo INNER JOIN tblorderhistory ON tblorderhistory.intOrderNo= tblorder.intOrderNo
      WHERE tblproductinventory.intUserID= ? AND tblorderhistory.intStatus= 3 AND ${sDatePrev}`,
      [req.user.intUserID], (err, results, fields) => {
      if (err) console.log(err);
      if (results[0]){
        results[0].TotalPrice ? results[0].TotalPrice = priceFormat(results[0].TotalPrice.toFixed(2)) : 0
      }
      sCountPrevious = results
      fsalesProdCount()
    });
  }
  function fsalesProdCount(){
    db.query(`SELECT COUNT(A.intProductNo)cnt FROM(${productsQuery})A`,
      [req.user.intUserID], (err, results, fields) => {
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
      limitQuery = productsQuery.concat(`LIMIT ${start},${pageLimit} `);
      fsalesProducts();
    });
  }
  function fsalesProducts(){
    db.query(limitQuery,
      [req.user.intUserID], (err, results, fields) => {
      if (err) console.log(err);
      results.forEach((obj)=>{
        obj.TotalPrice = priceFormat(obj.TotalPrice.toFixed(2));
      });
      sProducts = results
      fsalesInv();
    });
  }
  function fsalesInv(){
    db.query(`SELECT tblproductlist.intProductNo, tblproductinventory.strVariant, tblproductinventory.intSize, tbluom.strUnitName, tblorderdetails.purchasePrice,
      tblorderhistory.historyDate, SUM(tblorderdetails.intQuantity)QtySold, SUM(purchasePrice*tblorderdetails.intQuantity)TotalPrice FROM tblproductlist
      INNER JOIN tblproductinventory ON tblproductlist.intProductNo= tblproductinventory.intProductNo
      INNER JOIN tbluom ON tblproductinventory.intUOMno= tbluom.intUOMno
      INNER JOIN tblorderdetails ON tblproductinventory.intInventoryNo= tblorderdetails.intInventoryNo
      INNER JOIN tblorder ON tblorderdetails.intOrderNo= tblorder.intOrderNo
      INNER JOIN tblorderhistory ON tblorderhistory.intOrderNo= tblorder.intOrderNo
      WHERE tblproductinventory.intUserID= ? AND tblorderhistory.intStatus= 3 AND ${sDate}
      GROUP BY tblproductinventory.intInventoryNo ORDER BY tblproductlist.intProductNo`,
      [req.user.intUserID], (err, results, fields) => {
      if (err) console.log(err);
      results.forEach((obj)=>{
        obj.curSize = sizeString(obj);
        obj.TotalPrice = priceFormat(obj.TotalPrice.toFixed(2));
        obj.purchasePrice = priceFormat(obj.purchasePrice.toFixed(2));
      });
      sInv = results
      res.send({
        salesCountCurrent: sCountCurrent,
        salesCountPrevious: sCountPrevious,
        salesProducts: sProducts,
        salesInv: sInv,
        config: config
      });
    });
  }
});
router.post('/prodSalesDetails', monthsAvailable, yearsAvailable, (req,res)=>{
  let sProducts, sInv,
  config = {
    filterBy: req.body.filterBy
  }
  req.body.filterBy == 'specialDate' ?
    req.monthsAvailable[0] ?
      req.monthsAvailable.reduce((temp, month)=>{
        console.log(temp)
        return month.month == req.body.month ? 1 : temp
      },0) ?
        0 :
        req.body.month == 'All' ?
          0 :
          config.filterBy = 'thisWeek'
      : config.filterBy = 'thisWeek'
    : 0
  req.body.filterBy == 'specialDate' ?
    req.yearsAvailable[0] ?
      req.yearsAvailable.reduce((temp, year)=>{
        console.log(temp)
        return year.year == req.body.year ? 1 : temp
      },0) ?
        0 : config.filterBy = 'thisWeek'
      : config.filterBy = 'thisWeek'
    : 0
  switch (config.filterBy) {
    case 'thisWeek':
      sDate = 'WEEK(tblorderhistory.historyDate)= WEEK(CURDATE())';
      break;
    case 'thisMonth':
      sDate = 'MONTH(tblorderhistory.historyDate)= MONTH(CURDATE())';
      break;
    case 'thisYear':
      sDate = 'YEAR(tblorderhistory.historyDate)= YEAR(CURDATE())';
      break;
    default:
      if(req.body.month == 'All'){
        sDate = `YEAR(tblorderhistory.historyDate)= ${req.body.year}`;
      }
      else{
        sDateMonth = `MONTH(tblorderhistory.historyDate)= ${req.body.month} AND YEAR(tblorderhistory.historyDate)= ${req.body.year}`;
      }
      break;
  }

  db.query(`SELECT tblproductlist.intProductNo, tblproductbrand.strBrand, tblproductlist.strProductName, tblproductlist.strProductPicture, tblorderhistory.historyDate,
    SUM(tblorderdetails.intQuantity)QtySold, SUM(purchasePrice*tblorderdetails.intQuantity)TotalPrice FROM tblproductlist
    INNER JOIN tblproductbrand ON tblproductlist.intBrandNo= tblproductbrand.intBrandNo
    INNER JOIN tblproductinventory ON tblproductlist.intProductNo= tblproductinventory.intProductNo
    INNER JOIN tblorderdetails ON tblproductinventory.intInventoryNo= tblorderdetails.intInventoryNo
    INNER JOIN tblorder ON tblorderdetails.intOrderNo= tblorder.intOrderNo
    INNER JOIN tblorderhistory ON tblorderhistory.intOrderNo= tblorder.intOrderNo
    WHERE tblproductinventory.intUserID= ? AND tblproductlist.intProductNo= ? AND tblorderhistory.intStatus= 3 AND ${sDate}
    GROUP BY tblproductlist.intProductNo ORDER BY tblproductlist.intProductNo`,
    [req.user.intUserID, req.body.prodid], (err, results, fields) => {
    if (err) console.log(err);
    results.forEach((obj)=>{
      obj.TotalPrice = priceFormat(obj.TotalPrice.toFixed(2));
    });
    sProducts = results
    db.query(`SELECT tblproductlist.intProductNo, tblproductinventory.strVariant, tblproductinventory.intSize, tbluom.strUnitName, tblorderdetails.purchasePrice,
      tblorderhistory.historyDate, SUM(tblorderdetails.intQuantity)QtySold, SUM(purchasePrice*tblorderdetails.intQuantity)TotalPrice FROM tblproductlist
      INNER JOIN tblproductinventory ON tblproductlist.intProductNo= tblproductinventory.intProductNo
      INNER JOIN tbluom ON tblproductinventory.intUOMno= tbluom.intUOMno
      INNER JOIN tblorderdetails ON tblproductinventory.intInventoryNo= tblorderdetails.intInventoryNo
      INNER JOIN tblorder ON tblorderdetails.intOrderNo= tblorder.intOrderNo
      INNER JOIN tblorderhistory ON tblorderhistory.intOrderNo= tblorder.intOrderNo
      WHERE tblproductinventory.intUserID= ? AND tblproductlist.intProductNo= ? AND tblorderhistory.intStatus= 3 AND ${sDate}
      GROUP BY tblproductinventory.intInventoryNo ORDER BY tblproductlist.intProductNo`,
      [req.user.intUserID, req.body.prodid], (err, results, fields) => {
      if (err) console.log(err);
      results.forEach((obj)=>{
        obj.curSize = sizeString(obj);
        obj.TotalPrice = priceFormat(obj.TotalPrice.toFixed(2));
        obj.purchasePrice = priceFormat(obj.purchasePrice.toFixed(2));
      });
      sInv = results
      res.send({
        product: sProducts,
        inv: sInv,
        config: config
      });
    });
  });
});

exports.consignorSales = router;
