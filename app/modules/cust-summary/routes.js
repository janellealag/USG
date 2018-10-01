const express = require('express');
const router = express.Router();
const db = require('../../lib/database')();
const priceFormat = require('../cust-0extras/priceFormat');
const moment = require('moment');
const userTypeAuth = require('../cust-0extras/userTypeAuth');
const auth_cust = userTypeAuth.cust;
const fs = require('fs');
const firstID = 1000;
const quantLimit = 50;

function sizeString(obj){
  let curSize = ``;
  obj.strVariant ? curSize+= `${obj.strVariant}`: 0
  obj.strVariant && obj.intSize ? curSize+= ` - `: 0
  obj.intSize ? curSize+= `${obj.intSize}`: 0
  obj.strUnitName ? curSize+= ` ${obj.strUnitName}`: 0
  return curSize;
}
function orderArraySort(a,b) {
  if (a.intOrderDetailsNo < b.intOrderDetailsNo)
    return -1;
  if (a.intOrderDetailsNo > b.intOrderDetailsNo)
    return 1;
  return 0;
}

function newOrderNo (req, res, next){
  db.query(`SELECT * FROM tblorder ORDER BY intOrderNo DESC LIMIT 1`, (err, results, fields) => {
    if (err) console.log(err);
    req.newOrderNo = results[0] ? parseInt(results[0].intOrderNo)+1 : firstID;
    return next();
  });
}
function newOrderDetailsNo (req, res, next){
  db.query(`SELECT * FROM tblorderdetails ORDER BY intOrderDetailsNo DESC LIMIT 1`, (err, results, fields) => {
    if (err) console.log(err);
    req.newOrderDetailsNo = results[0] ? parseInt(results[0].intOrderDetailsNo)+1 : firstID;
    return next();
  });
}
function newOrderHistoryNo (req, res, next){
  db.query(`SELECT * FROM tblorderhistory ORDER BY intOrderHistoryNo DESC LIMIT 1`, (err, results, fields) => {
    if (err) console.log(err);
    req.newOrderHistoryNo = results[0] ? parseInt(results[0].intOrderHistoryNo)+1 : firstID;
    return next();
  });
}
function newMessageNo (req, res, next){
  db.query(`SELECT * FROM tblmessages ORDER BY intMessageNo DESC LIMIT 1`, (err, results, fields) => {
    if (err) console.log(err);
    req.newMessageNo = results[0] ? parseInt(results[0].intMessageNo)+1 : firstID;
    return next();
  });
}

function checkUser (req, res, next){
  if(!req.user){
    req.session.pendRoute = 2;
    req.flash('regSuccess', 'Login to proceed to Checkout');
    res.redirect('/login');
  }
  else{
    req.session.pendRoute = 0;
    return next();
  }
}
function checkUserAccount(req, res, next){
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
function checkUserOrder (req, res, next){
  if(!req.user){
    req.session.pendRoute = 3;
    req.flash('regSuccess', 'Login to proceed to View Order');
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
function orderTotal (req, res, next){
  db.query(`SELECT *, IF(discountPrice IS NOT NULL, totalOriginalPrice-discountPrice, totalOriginalPrice)totalPrice FROM(
    SELECT SUM(purchasePrice*intQuantity)totalOriginalPrice, SUM(purchasePrice*discount*.01*intQuantity)discountPrice FROM tblorder
    INNER JOIN tblorderdetails ON tblorder.intOrderNo= tblorderdetails.intOrderNo WHERE tblorder.intOrderNo= ?)A`,
    [req.params.orderNo], (err, results, fields) => {
    if (err) console.log(err);
    results[0].totalPrice ? results.map( obj => obj.totalPrice = priceFormat(obj.totalPrice.toFixed(2)) ) : 0
    req.orderTotal = results[0];
    return next();
  });
}
function orderProductQty (req, res, next){
  db.query(`SELECT (intInventoryNo)Inv, (tblorderdetails.intQuantity)Qty, intProductType
    FROM tblorderdetails INNER JOIN tblorder ON tblorderdetails.intOrderNo= tblorder.intOrderNo
    WHERE tblorder.intOrderNo= ?`,[req.body.orderNo], (err, results, fields) => {
    if (err) console.log(err);
    req.orderProductQty = results;
    return next();
  });
}
function cartCheck (req, res, next){
  function cartLimitLoop(i){
    let cart = req.session.cart, stringquery1, bodyarray1;
    if (cart[i].type == 1){
      stringquery1 = `SELECT (intQuantity - intReservedItems)stock FROM tblproductinventory WHERE intInventoryNo= ?`
      bodyarray1 = [cart[i].inv]
    }
    else{
      stringquery1 = `SELECT (intQuantity - intReservedItems)stock FROM tblpackage WHERE intPackageNo= ?`
      bodyarray1 = [cart[i].package]
    }
    db.query(stringquery1, bodyarray1, (err, results, fields) => {
      if (err) console.log(err);
      req.session.cart[i].limit = results[0].stock > quantLimit ?
        quantLimit : results[0].stock;
      req.session.cart[i].curQty > req.session.cart[i].limit ?
        req.session.cart[i].curQty = req.session.cart[i].limit : 0;
      results[0].stock < 1 ? req.session.cart.splice(i,1) : 0
      ++i;
      if (cart.length > i){
        cartLimitLoop(i);
      }
      else{
        if (req.session.cart.length){
          return next();
        }
        else{
          res.redirect('/summary/checkout');
        }
      }
    });
  }
  req.session.cart.length ? cartLimitLoop(0) : res.redirect('/summary/checkout');
}
function admin (req, res, next){
  db.query(`SELECT * FROM tbladmin WHERE intUserID= 1000`, (err, results, fields) => {
    if (err) console.log(err);
    results[0].totalPrice ? results.map( obj => obj.totalPrice = priceFormat(obj.totalPrice.toFixed(2)) ) : 0

    results[0] ? results[0].bankServiceFee = priceFormat(results[0].bankServiceFee.toFixed(2)) : 0
    req.admin = results[0];
    return next();
  });
}
function thisOrder (req, res, next){
  db.query(`SELECT * FROM tblorder WHERE intOrderNo= ?`, [req.body.orderNo], (err, results, fields) => {
    if (err) console.log(err);
    req.thisOrder = results[0];
    return next();
  });
}
function orderPackages (req, res, next){
  db.query(`SELECT *, (tblorder.intStatus)orderStatus, (tblorderdetails.intQuantity)orderQty FROM tblorder
    INNER JOIN tblorderdetails ON tblorder.intOrderNo= tblorderdetails.intOrderNo
    INNER JOIN tblpackage ON tblorderdetails.intInventoryNo= tblpackage.intPackageNo
    WHERE tblorder.intOrderNo= ? AND tblorder.intUserID= ? AND tblorderdetails.intProductType= 2`,
    [req.params.orderNo, req.user.intUserID], (err, results, fields) => {
    if (err) console.log(err);
    if (results[0]){
      results.map( obj => obj.packagePrice = priceFormat(obj.packagePrice.toFixed(2)) );
    }
    req.orderPackages = results;
    return next();
  });
}
function receiptPackages (req, res, next){
  db.query(`SELECT (customer.strFname)customerF, (customer.strMname)customerM, (customer.strLname)customerL, orders.*, tblorder.*
    FROM tblorder INNER JOIN (SELECT * FROM tbluser)customer ON tblorder.intUserID= customer.intUserID
    INNER JOIN (SELECT tblorderdetails.*, strPackageName, (packagePrice*tblorderdetails.intQuantity)amount, (packagePrice-(packagePrice*0.12))priceNonVAT,
    ((packagePrice-(packagePrice*0.12))*tblorderdetails.intQuantity)amountNonVAT
    FROM tblorderdetails INNER JOIN tblpackage ON tblorderdetails.intInventoryNo= tblpackage.intPackageNo)orders ON orders.intOrderNo= tblorder.intOrderNo
    WHERE tblorder.intOrderNo= ? AND customer.intUserID= ? AND orders.intProductType= 2 ORDER BY orders.intOrderDetailsNo`,
    [req.params.orderNo, req.user.intUserID], (err, results, fields) => {
    if (err) console.log(err);
    req.receiptPackages = results;
    return next();
  });
}

function popularProducts(req,res,next){
  /*Most Popular Products;
  *(tblproductlist)*(tblproductbrand)*(tblproductinventory)*(tblorderdetails)*(tblproductreview)*/
  db.query(`SELECT B.*, ROUND(AVG(Review.intStars),1)AS aveRating, COUNT(Review.intProductReviewNo)AS cntRating,
    COUNT(Review.strReview)AS cntReview FROM
    (
    	SELECT A.*, OrderCNT FROM
    	(
    		SELECT tblproductlist.*, Inv.intInventoryNo, min(Inv.productPrice)minPrice,max(Inv.productPrice)maxPrice,
        Brand.strBrand, max(Inv.discount)maxDisc FROM tblproductlist
        INNER JOIN (SELECT * FROM tblproductbrand)Brand ON tblproductlist.intBrandNo= Brand.intBrandNo
    		INNER JOIN
    		(
    			SELECT tblproductinventory.intInventoryNo,intProductNo, discount,
    			IF(discount IS NOT NULL, productPrice-(productPrice*discount*.01), productPrice)productPrice, discountDueDate
    			FROM tblproductinventory LEFT JOIN
    			(
    				SELECT * FROM tblproductdiscount WHERE curdate() <= discountDueDate AND intStatus= 1
    			)Discount ON tblproductinventory.intInventoryNo= Discount.intInventoryNo
    		)Inv ON tblproductlist.intProductNo= Inv.intProductNo
    		WHERE Brand.intStatus= 1 GROUP BY tblproductlist.intProductNo
    	)A
    	LEFT JOIN
    	(
    		SELECT tblproductlist.intProductNo, COUNT(intOrderDetailsNo)OrderCNT FROM tblorderdetails
    		INNER JOIN tblproductinventory ON tblorderdetails.intInventoryNo= tblproductinventory.intInventoryNo
    		INNER JOIN tblproductlist ON tblproductinventory.intProductNo= tblproductlist.intProductNo
    		GROUP BY tblproductlist.intProductNo
    	)Orders ON A.intProductNo= Orders.intProductNo
    )B
    LEFT JOIN (SELECT * FROM tblproductreview)Review ON B.intProductNo = Review.intProductNo
    GROUP BY B.intProductNo ORDER BY OrderCNT DESC,B.intProductNo LIMIT 10`, function (err,  results, fields) {
    if (err) console.log(err);
    results[0] ? results.forEach((obj)=>{
      obj.minPrice = priceFormat(obj.minPrice.toFixed(2)) ;
      obj.maxPrice = priceFormat(obj.maxPrice.toFixed(2)) ;
    }) : 0
    req.popularProducts= results;
    return next();
  });
}
function newProducts(req,res,next){
  /*New Popular Products;
  *(tblproductlist)*(tblproductbrand)*(tblproductinventory)*(tblproductreview)*/
  db.query(`SELECT A.*, ROUND(AVG(Review.intStars),1)AS aveRating, COUNT(Review.intProductReviewNo)AS cntRating,
    COUNT(Review.strReview)AS cntReview FROM
    (
    	SELECT tblproductlist.*, Inv.intInventoryNo, min(Inv.productPrice)minPrice,max(Inv.productPrice)maxPrice,
    	Brand.strBrand, max(Inv.discount)maxDisc FROM tblproductlist
    	INNER JOIN (SELECT * FROM tblproductbrand)Brand ON tblproductlist.intBrandNo= Brand.intBrandNo
    	INNER JOIN
    	(
    		SELECT tblproductinventory.intInventoryNo,intProductNo, discount,
    		IF(discount IS NOT NULL, productPrice-(productPrice*discount*.01), productPrice)productPrice, discountDueDate
    		FROM tblproductinventory LEFT JOIN
    		(
    			SELECT * FROM tblproductdiscount WHERE curdate() <= discountDueDate AND intStatus= 1
    		)Discount ON tblproductinventory.intInventoryNo= Discount.intInventoryNo
    	)Inv ON tblproductlist.intProductNo= Inv.intProductNo
    	WHERE Brand.intStatus= 1 GROUP BY tblproductlist.intProductNo
    )A
    LEFT JOIN (SELECT * FROM tblproductreview)Review ON A.intProductNo = Review.intProductNo
    GROUP BY A.intProductNo ORDER BY A.intProductNo DESC LIMIT 10`, function (err,  results, fields) {
    if (err) console.log(err);
    results[0] ? results.forEach((obj)=>{
      obj.minPrice = priceFormat(obj.minPrice.toFixed(2)) ;
      obj.maxPrice = priceFormat(obj.maxPrice.toFixed(2)) ;
    }) : 0
    req.newProducts= results;
    return next();
  });
}
function packages(req,res,next){
  db.query(`SELECT *, SUM(intProductQuantity)Qty FROM tblpackage
    INNER JOIN tblpackagelist ON tblpackage.intPackageNo= tblpackagelist.intPackageNo
    WHERE tblpackage.intStatus= 1 AND (tblpackage.intQuantity - tblpackage.intReservedItems) > 0 GROUP BY tblpackage.intPackageNo ORDER BY tblpackage.intPackageNo DESC`,
    function (err,  results, fields) {
    if (err) console.log(err);
    results.forEach((obj)=>{ obj.packagePrice = priceFormat(obj.packagePrice.toFixed(2)) })
    req.packages= results;
    return next();
  });
}

router.get('/checkout', checkUser, auth_cust, contactDetails, admin, (req,res)=>{
  let notices = [
    `Products will be delivered within ${req.admin.deliveryPeriod} working day/s`,
    `Remember to refresh list before placing order`,
    `Only one discount voucher per order is allowed`
  ];

  res.render('cust-summary/views/checkout', {
    thisUser: req.user,
    thisUserContact: req.contactDetails,
    admin: req.admin,
    notices: notices
  });
});
router.get('/order/:orderNo', checkUserOrder, auth_cust, orderTotal, orderPackages, admin, (req,res)=>{
  db.query(`SELECT tblproductlist.*, tblproductbrand.*, tbluom.*, tblproductinventory.intSize, tblproductinventory.strVariant,
    tblorder.*, tblorderdetails.intOrderDetailsNo, tblorderdetails.intProductType, tblorderdetails.intQuantity,
    (productPrice)oldPrice, discount, IF(discount IS NOT NULL, productPrice-(productPrice*discount*.01), productPrice)productPrice,
    (tblorder.intStatus)orderStatus, (tblorderdetails.intQuantity)orderQty FROM tblorder
    INNER JOIN tblorderdetails ON tblorder.intOrderNo= tblorderdetails.intOrderNo
    INNER JOIN tblproductinventory ON tblorderdetails.intInventoryNo= tblproductinventory.intInventoryNo
    INNER JOIN tblproductlist ON tblproductinventory.intProductNo= tblproductlist.intProductNo
    INNER JOIN tblproductbrand ON tblproductlist.intBrandNo= tblproductbrand.intBrandNo
    INNER JOIN tbluom ON tblproductinventory.intUOMno= tbluom.intUomNo
    WHERE tblorder.intOrderNo= ? AND tblorder.intUserID= ? AND tblorderdetails.intProductType= 1`,
    [req.params.orderNo, req.user.intUserID], (err, results, fields) => {
    if (err) console.log(err);
    if (results[0] || req.orderPackages[0]){
      results = results.concat(req.orderPackages)
      results.sort(orderArraySort);
      results.forEach((obj)=>{
        obj.dateOrdered = moment(obj.dateOrdered).format('LL');
        obj.productPrice ? obj.purchasePrice = priceFormat(obj.productPrice.toFixed(2)): 0
        obj.oldPrice ? obj.oldPrice = priceFormat(obj.oldPrice.toFixed(2)): 0
        obj.intSize = sizeString(obj);
      });
      let orderLength = results.reduce((temp, obj)=>{
        return temp += obj.orderQty
      },0);
      let notices = {
        special : [],
        general : []
      }
      if (!results[0].intPaymentStatus && results[0].intPaymentMethod == 2){
        notices.special.push(`Upload your deposit slip in the Order Summary section below`)
        notices.special.push(`Order will be processed after payment verification`)
      }
      notices.general.push(`Products will be delivered within ${req.admin.deliveryPeriod} working day/s`)
      notices.general.push(`Bank payments are valid within 24 hours of order, failure to pay cancels order`)
      notices.general.push(`Online receipt is available after payment is verified`)
      notices.general.push(`Option to return products is available within 2 days after they are delivered`)

      res.render('cust-summary/views/order', {
        thisUser: req.user,
        order: results,
        orderLength: orderLength,
        orderOne: results[0],
        orderNumber: req.params.orderNo,
        orderTotal: req.orderTotal.totalPrice,
        admin: req.admin,
        notices: notices
      });
    }
    else{
      res.redirect('/summary')
    }
  });
});
router.get('/voucher/:orderNo', checkUserOrder, auth_cust, orderTotal, (req,res)=>{
  if (!req.user){
    res.send('none')
  }
  else{
    db.query(`SELECT * FROM tblorder
      INNER JOIN tbluser ON tblorder.intUserID= tbluser.intUserID
      WHERE intOrderNo= ? AND tbluser.intUserID= ? AND (intStatus= 0 OR intStatus= 1 OR intStatus= 2)`,[req.params.orderNo, req.user.intUserID],(err,results,fields)=>{
      if (err) console.log(err);
      if (results[0]){
        results.map( obj => obj.dateOrdered = moment(obj.dateOrdered).format('LL') );
        results.map( obj => obj.paymentDue = moment(obj.paymentDue).format('LL') );
        res.send({order: results[0], orderTotal: req.orderTotal.totalPrice})
      }
      else{
        res.send('none')
      }
    });
  }
})
router.get('/receipt/:orderNo', checkUserOrder, auth_cust, receiptPackages, (req,res)=>{
  db.query(`SELECT (discountPrice-(discountPrice*0.12))priceNonVAT,
    ((discountPrice-(discountPrice*0.12))*orders.intQuantity)amountNonVAT,
    (customer.strFname)customerF, (customer.strMname)customerM, (customer.strLname)customerL, orders.*, tblorder.*
    FROM tblorder INNER JOIN (SELECT * FROM tbluser)customer ON tblorder.intUserID= customer.intUserID
    INNER JOIN (SELECT tblorderdetails.*, strBrand, strProductName, strVariant, intSize, strUnitName,
    (purchasePrice-(purchasePrice*discount*0.01))discountPrice,
  	((purchasePrice-(purchasePrice*discount*0.01))*tblorderdetails.intQuantity)amount
  	FROM tblorderdetails INNER JOIN tblproductinventory ON tblorderdetails.intInventoryNo= tblproductinventory.intInventoryNo
  	INNER JOIN tblproductlist ON tblproductinventory.intProductNo= tblproductlist.intProductNo
  	INNER JOIN tblproductbrand ON tblproductlist.intBrandNo= tblproductbrand.intBrandNo
  	INNER JOIN tbluom ON tblproductinventory.intUOMno= tbluom.intUOMno)orders ON orders.intOrderNo= tblorder.intOrderNo
    WHERE tblorder.intOrderNo= ? AND customer.intUserID= 1010 AND orders.intProductType= 1
    ORDER BY orders.intOrderDetailsNo`,[req.params.orderNo, req.user.intUserID], (err, results, fields) => {
    if (err) console.log(err);
    if (results[0] || req.receiptPackages[0]){
      results = results.concat(req.receiptPackages);
      results.sort(orderArraySort);
      let totalNonVAT = results.reduce((data, obj)=>{
        return data + obj.amountNonVAT
      }, 0);
      let totalPrice = results.reduce((data, obj)=>{
        return data + obj.amount
      }, 0);
      let vat = totalPrice - totalNonVAT;
      results.forEach((obj)=>{
        obj.intProductType == 1 ?
          obj.name = `${obj.strBrand} ${obj.strProductName} ${sizeString(obj)}`:
          obj.name = obj.strPackageName
        obj.dateOrdered = moment(obj.dateOrdered).format('MM/DD/YY');
        obj.priceNonVAT = priceFormat(obj.priceNonVAT.toFixed(2))
        obj.amountNonVAT = priceFormat(obj.amountNonVAT.toFixed(2))
      });
      totalNonVAT = priceFormat(totalNonVAT.toFixed(2));
      totalPrice = priceFormat(totalPrice.toFixed(2));
      vat = priceFormat(vat.toFixed(2));

      res.send({
        receipt: results,
        receiptNonVAT: totalNonVAT,
        vat: vat,
        receiptTotal: totalPrice,
      })
      // console.log(results)
    }
    else{
      res.send('none')
    }
  });
})
router.get('/tracker/:orderNo', checkUserOrder, auth_cust, (req,res)=>{
  db.query(`SELECT intStatus FROM tblorderhistory WHERE intOrderNo= ?`,[req.params.orderNo],(err,results,fields)=>{
    if (err) console.log(err);
    res.send({status: results})
  });

});

router.post('/checkout', checkUser, auth_cust, contactDetails, newOrderNo, newOrderDetailsNo, newOrderHistoryNo,
 newMessageNo, cartCheck, admin, popularProducts, newProducts, packages, (req,res)=>{
  req.session.cart.forEach((data,i)=>{
    data.curQty == 0 ? req.session.cart.splice(i,1) : 0
  })
  db.beginTransaction(function(err) {
    if (err) console.log(err);
    let thisOrderNo = req.newOrderNo, thisOrderHistoryNo = req.newOrderHistoryNo, thisMessageNo = req.newMessageNo;
    db.query(`INSERT INTO tblorder (intOrderNo, intUserID, intPaymentMethod, strShippingAddress, strBillingAddress, paymentDue)
      VALUES (?,?,?,?,?,CURDATE() + INTERVAL 1 DAY)`,[thisOrderNo, req.user.intUserID, req.body.paymentMethod, req.contactDetails.strShippingAddress, req.contactDetails.strBillingAddress ], (err, results, fields) => {
      if (err) console.log(err);
      db.query(`INSERT INTO tblorderhistory (intOrderHistoryNo, intOrderNo, intAdminID, intMessageNo, strShippingAddress, strBillingAddress)
        VALUES (?,?,?,0,?,?)`,[thisOrderHistoryNo, thisOrderNo, 1000, req.contactDetails.strShippingAddress, req.contactDetails.strBillingAddress ], (err, results, fields) => {
        if (err) console.log(err);
        db.query(`INSERT INTO tblmessages (intMessageNo, intOrderHistoryNo, strMessage, intAdminID)
          VALUES (?,?,?,?)`,[thisMessageNo, thisOrderHistoryNo, `Order #${thisOrderNo} has been placed`, 1000], (err, results, fields) => {
          if (err) console.log(err);
          function multiInsert(i){
            let cart = req.session.cart;

            if (cart[i].type == 1){
              inv = cart[i].inv
              stringquery1 = `SELECT productSRP, (productPrice)price FROM tblproductinventory WHERE intInventoryNo= ?`
              stringquery2 = `SELECT discount FROM tblproductdiscount WHERE intInventoryNo= ? AND curdate() <= discountDueDate LIMIT 1`
              stringquery3 = `SELECT (intQuantity - intReservedItems)stock, intReservedItems FROM tblproductinventory WHERE intInventoryNo= ?`
              stringquery4 = `UPDATE tblproductinventory SET intReservedItems= ? WHERE intInventoryNo= ?`
            }
            else{
              inv = cart[i].package
              stringquery1 = `SELECT (0)productSRP, (packagePrice)price FROM tblpackage WHERE intPackageNo= ?`
              stringquery2x = `SELECT (0)discount, ?`
              stringquery3 = `SELECT (intQuantity - intReservedItems)stock, intReservedItems FROM tblpackage WHERE intPackageNo= ?`
              stringquery4 = `UPDATE tblpackage SET intReservedItems= ? WHERE intPackageNo= ?`
            }
            db.query(stringquery1, [inv], (err, srp, fields) => {
              if (err) console.log(err);
              db.query(stringquery2, [inv], (err, results, fields) => {
                if (err) console.log(err);
                discount = results[0] ? results[0].discount : 0
                db.query(`INSERT INTO tblorderdetails (intOrderDetailsNo, intOrderNo, intInventoryNo, intProductType, intStatus, purchasePrice, intQuantity, currentSRP, discount)
                  VALUES (?,?,?,?,?,?,?,?,?)`,[req.newOrderDetailsNo + i, thisOrderNo, inv, cart[i].type, 1, srp[0].price, cart[i].curQty, srp[0].productSRP, discount], (err, results, fields) => {
                  if (err) console.log(err);
                  db.query(stringquery3, [inv], (err, results, fields) => {
                    if (results[0].stock){
                      newQty = parseInt(results[0].intReservedItems) + parseInt(cart[i].curQty);
                      db.query(stringquery4, [newQty, inv], (err, results1, fields) => {
                        if (err) console.log(err);
                        ++i;
                        if (cart.length > i){
                          multiInsert(i);
                        }
                        else{
                          db.commit(function(err) {
                            if (err) console.log(err);
                            req.session.cart = null;
                            res.render('cust-summary/views/orderSuccess', {
                              thisUser: req.user,
                              orderNumber: thisOrderNo,
                              checkUpdateOrder: req.body.paymentMethod,
                              admin: req.admin,
                              popularProducts: req.popularProducts,
                              newProducts: req.newProducts,
                              packages: req.packages
                            });
                          });
                        }
                      });
                    }
                    else{
                      ++i;
                      if (cart.length > i){
                        multiInsert(i);
                      }
                      else{
                        db.commit(function(err) {
                          if (err) console.log(err);
                          req.session.cart = null;
                          res.redirect(`/summary/sample`,{message: 'Something went wrong'});
                        });
                      }
                    }
                  });
                });
              });
            });
          }
          // function stockControl(cart,i,j){
          //   db.query(`SELECT (intQuantity - intReservedItems)stock, intReservedItems FROM tblproductinventory
          //     WHERE intInventoryNo = ?`,[cart[i].inv, j+1], (err, results, fields) => {
          //     if (err) console.log(err);
          //     ++j;
          //     let thisBatchNo = results[0].intBatchNo;
          //     if (results[0].stock == 0){
          //       stockControl(cart,i,j);
          //     }
          //     else{
          //       let newQty = cart[i].curQty >= results[0].stock ?
          //         results[0].intQuantity : cart[i].curQty + results[0].intReservedItems;
          //       cart[i].curQty -= results[0].stock;
          //
          //       db.query(`UPDATE tblbatch SET intReservedItems= ? WHERE intBatchNo= ?`,[newQty, thisBatchNo], (err, results1, fields) => {
          //         if (err) console.log(err);
          //         if (cart[i].curQty > 0){
          //           stockControl(cart,i,j);
          //         }
          //         else{
          //           ++i;
          //           if (cart.length > i){
          //             multiInsert(i);
          //           }
          //           else{
          //             db.commit(function(err) {
          //               if (err) console.log(err);
          //               req.session.cart = null;
          //               res.redirect(`/summary/success/${thisOrderNo}`);
          //             });
          //           }
          //         }
          //       });
          //     }
          //
          //   });
          // }

          req.session.cart ? multiInsert(0) : res.redirect(`/summary/success`);
        });
      });
    });
  });
});
router.post('/checkout/address', checkUser, (req,res)=>{
  db.query(`UPDATE tblcustomer SET strShippingAddress= ?, strBillingAddress= ? WHERE intUserID= ?`,
    [req.body.sa, req.body.ba, req.user.intUserID], (err, results, fields) => {
    if (err) console.log(err);
    res.redirect('/summary/checkout');
  });
})
router.post('/order/cancel', checkUserOrder, orderProductQty, newOrderHistoryNo, newMessageNo, thisOrder, (req,res)=>{
  let reason = req.body.cancelreason == 'other' ? req.body.canceldesc : req.body.cancelreason,
  thisOrderHistoryNo = req.newOrderHistoryNo, thisMessageNo = req.newMessageNo, thisOrder = req.thisOrder;
  db.beginTransaction(function(err) {
    if (err) console.log(err);
    db.query(`UPDATE tblorder SET intStatus= 6, strCancellationReason= ? WHERE intOrderNo= ?`,
      [reason, req.body.orderNo], (err, results, fields) => {
      if (err) console.log(err);
      db.query(`INSERT INTO tblorderhistory (intOrderHistoryNo, intOrderNo, intStatus, intAdminID, intMessageNo, strShippingAddress, strBillingAddress)
        VALUES (?,?,6,?,0,?,?)`,[thisOrderHistoryNo, req.body.orderNo, 1000, thisOrder.strShippingAddress, thisOrder.strBillingAddress ], (err, results, fields) => {
        if (err) console.log(err);
        db.query(`INSERT INTO tblmessages (intMessageNo, intOrderHistoryNo, strMessage, intAdminID)
          VALUES (?,?,?,?)`,[thisMessageNo, thisOrderHistoryNo, `Order #${req.body.orderNo} has been cancelled`, 1000], (err, results, fields) => {
          if (err) console.log(err);
          function stockReturn(i){
            if (req.orderProductQty[i].intProductType == 1){
              stringquery1 = `SELECT intReservedItems FROM tblproductinventory WHERE intInventoryNo = ?`;
              stringquery2 = `UPDATE tblproductinventory SET intReservedItems= ? WHERE intInventoryNo= ?`
            }else{
              stringquery1 = `SELECT intReservedItems FROM tblpackage WHERE intPackageNo = ?`;
              stringquery2 = `UPDATE tblpackage SET intReservedItems= ? WHERE intPackageNo= ?`
            }

            db.query(stringquery1,[req.orderProductQty[i].Inv], (err, results, fields) => {
              if (err) console.log(err);
              let newQty = results[0].intReservedItems - req.orderProductQty[i].Qty;

              db.query(stringquery2,[newQty, req.orderProductQty[i].Inv], (err, results1, fields) => {
                if (err) console.log(err);
                ++i;
                if (req.orderProductQty.length > i){
                  stockReturn(i);
                }
                else{
                  db.commit(function(err) {
                    if (err) console.log(err);
                    res.redirect('/account/orders');
                  });
                }
              });
            });
          }

          stockReturn(0);
        });
      });
    });
  });
})
router.post('/order/upload-slip', checkUserOrder, thisOrder, (req,res)=>{
  let img = `bs-${req.body.orderNo.toString()}.png`
  if(!thisOrder){
    res.redirect('/noroute');
  }
  else if(!req.files.bankslip){
    req.thisOrder.depositSlip ? fs.unlink('public/customer-assets/images/userImages/bankslips/'+img) : 0
    db.beginTransaction(function(err) {
      if (err) console.log(err);
      db.query(`UPDATE tblorder SET depositSlip= NULL WHERE intOrderNo= ?`, [req.body.orderNo], (err,results,fields)=>{
        if (err) console.log(err);
        db.commit(function(err) {
          if (err) console.log(err);
          res.render('cust-0extras/views/messagePage',{message: 'File Removed', messBtn: `Back to Order#${req.body.orderNo}`, messLink: `/summary/order/${req.body.orderNo}`});
        });
      });
    });
  }
  else if(req.files.bankslip.mimetype != 'image/jpeg' && req.files.bankslip.mimetype != 'image/png'){
    res.render('cust-0extras/views/messagePage',{message: 'Oops! You uploaded an invalid file.', messBtn: `Back to Order#${req.body.orderNo}`, messLink: `/summary/order/${req.body.orderNo}`});
  }
  else{
    req.thisOrder.depositSlip ? fs.unlink('public/customer-assets/images/userImages/bankslips/'+img) : 0
    db.beginTransaction(function(err) {
      if (err) console.log(err);
      req.files.bankslip.mv('public/customer-assets/images/userImages/bankslips/'+img, function(err){
        db.query(`UPDATE tblorder SET depositSlip= ? WHERE intOrderNo= ?`, [img, req.body.orderNo], (err,results,fields)=>{
          if (err) console.log(err);
          db.commit(function(err) {
            if (err) console.log(err);
            res.render('cust-0extras/views/messagePage',{message: 'File Uploaded', messBtn: `Back to Order#${req.body.orderNo}`, messLink: `/summary/order/${req.body.orderNo}`});
          });
        });
      });
    });

  }

});

exports.summary = router;
