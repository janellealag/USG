const express = require('express');
const router = express.Router();
const db = require('../../lib/database')();
const priceFormat = require('../cust-0extras/priceFormat');
const dateFormat = require('../cust-0extras/dateFormat');
const timeDerived = require('../cust-0extras/timeDerived');

function thisProduct(req,res,next){
  /*Currently Viewed Product, Match(params);
  *(tblproductlist)*(tblproductbrand)*(tblproductinventory)*(tblproductreview)*/
  db.query(`SELECT A.*, tblsubcategory.*, tblcategory.*, ROUND(AVG(Review.intStars),1)AS aveRating, COUNT(Review.intProductReviewNo)AS cntRating,
    COUNT(Review.strReview)AS cntReview,
    SUM(case when Review.intStars= 1 then 1 else 0 end) AS OneS,
    SUM(case when Review.intStars= 2 then 1 else 0 end) AS TwoS,
    SUM(case when Review.intStars= 3 then 1 else 0 end) AS ThreeS,
    SUM(case when Review.intStars= 4 then 1 else 0 end) AS FourS,
    SUM(case when Review.intStars= 5 then 1 else 0 end) AS FiveS FROM(
    SELECT tblproductlist.*, Inv.intInventoryNo, Inv.intStatus As InvStatus, Inv.productPrice, Brand.strBrand FROM tblproductlist
    INNER JOIN (SELECT * FROM tblproductbrand)Brand ON tblproductlist.intBrandNo= Brand.intBrandNo
    INNER JOIN (SELECT * FROM tblproductinventory)Inv ON tblproductlist.intProductNo= Inv.intProductNo
    WHERE Brand.intStatus= 1 AND tblproductlist.intProductNo= ? GROUP BY tblproductlist.intProductNo)A
    LEFT JOIN (SELECT * FROM tblproductreview)Review ON A.intProductNo = Review.intProductNo
    INNER JOIN tblsubcategory ON A.intSubCategoryNo= tblsubcategory.intSubCategoryNo
    INNER JOIN tblcategory ON tblsubcategory.intCategoryNo= tblcategory.intCategoryNo
    GROUP BY A.intProductNo`,[req.params.prodid], function (err,  results, fields) {
    if (err) console.log(err);
    if (results[0]){
      results[0].productPrice = priceFormat(results[0].productPrice.toFixed(2));
      req.thisProduct= results[0];
      return next();
    }
    else{
      res.redirect('/item')
    }
  });
}
function relatedProducts(req,res,next){
  /*Related Products;
  *(tblproductlist)*(tblproductbrand)*(tblproductinventory)*(tblproductreview)*/
  db.query(`SELECT A.*, ROUND(AVG(Review.intStars),1)AS aveRating, COUNT(Review.intProductReviewNo)AS cntRating, COUNT(Review.strReview)AS cntReview FROM(
    SELECT tblproductlist.*, Inv.intInventoryNo, Inv.intStatus As InvStatus, Inv.productPrice, Brand.strBrand FROM tblproductlist
    INNER JOIN (SELECT * FROM tblproductbrand)Brand ON tblproductlist.intBrandNo= Brand.intBrandNo
    INNER JOIN (SELECT * FROM tblproductinventory)Inv ON tblproductlist.intProductNo= Inv.intProductNo
    WHERE Brand.intStatus= 1 GROUP BY tblproductlist.intProductNo)A
    LEFT JOIN (SELECT * FROM tblproductreview)Review ON A.intProductNo = Review.intProductNo
    GROUP BY A.intProductNo ORDER BY intProductNo LIMIT 10`, function (err,  results, fields) {
    if (err) console.log(err);
    results.map( obj => obj.productPrice = priceFormat(obj.productPrice.toFixed(2)) );
    req.relatedProducts= results;
    return next();
  });
}
function productReviews(req,res,next){
  /*Related Products, Match(params);
  *(tblproductlist)*(tblproductreview)*(tbluser)*/
  db.query(`SELECT * FROM tblproductlist
    INNER JOIN tblproductreview ON tblproductlist.intProductNo= tblproductreview.intProductNo
    INNER JOIN tbluser ON tblproductreview.intUserID= tbluser.intUserID
    WHERE tblproductlist.intProductNo= ? AND tblproductreview.strReview IS NOT NULL`,
    [req.params.prodid], function (err,  results, fields) {
    if (err) console.log(err);
    results.map( obj => obj.created_at = [dateFormat(obj.created_at), timeDerived(obj.created_at)].join(' - ') );
    req.productReviews= results;
    return next();
  });
}

router.get('/:prodid', thisProduct, relatedProducts, productReviews, (req,res)=>{
  res.render('cust-item/views/index', {
    thisUser: req.user,
    thisProduct: req.thisProduct,
    relatedProducts: req.relatedProducts,
    productReviews: req.productReviews
  });
});

exports.item = router;
