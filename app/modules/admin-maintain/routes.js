var router = require('express').Router();
var db = require('../../lib/database')();
var moment = require('moment');

// Voucher -----------------------
router.get('/voucher', (req,res)=>{
  db.query(`Select * from tblvoucher`, (err1,results1,fields1)=>{
    if (err1) console.log(err1);

    db.query(`Select intVoucherNo, strVoucherCode from tblvoucher order by intvoucherno desc limit 1`,(err2,results2,fields2)=>{
      if (err2) console.log(err2);
      res.render('admin-maintain/views/voucher', {re:results1, moment: moment, lastvoucher: results2});

    });

  });
});

router.post('/addVoucher',(req,res)=>{
  db.query(`Insert into tblVoucher (intVoucherNo, strVoucherCode, strDescription, validityDate, discount) values ("${req.body.vno}", "${req.body.vcode}", "${req.body.vdesc}","${req.body.vvalid}", ${req.body.vdisc})`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);
    if (!err1) res.send("yes");
  });
});

router.post('/inactivateVoucher',(req,res)=>{
  db.query(`Update tblVoucher set intStatus = 0 where intVoucherNo = "${req.body.no}"`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);
    if (!err1) res.send("yes");
  });
});

router.post('/activateVoucher',(req,res)=>{
  db.query(`Update tblVoucher set intStatus = 1 where intVoucherNo = "${req.body.no}"`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);
    if (!err1) res.send("yes");
  });
});

router.get('/voucherUsers',(req,res)=>{
  var vno = req.query.number;
  var vcode = req.query.vcode;
  db.query(`Select * from tblvoucherusers
join tblUser on tblvoucherusers.intUserID = tblUser.intUserID
 where intvoucherno = "${vno}"`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);

    res.render('admin-maintain/views/voucherUsers', {re:results1, moment:moment, vcode: vcode});
  });
});

router.post('/editVoucher',(req,res)=>{
  res.send("yes");
});

// Batch -------------------------
router.get('/batch', (req,res)=>{
  res.render('admin-maintain/views/batch');
});

// Supplier --------------------------
router.get('/supplier', (req,res)=>{
  db.query(`Select tblSupplier.intStatus as Stats, tblUser.*,tblSupplier.* from
    tblUser join tblSupplier on tblUser.intUserID =
    tblSupplier.intUserID`,(err1,results1,fields1)=>{
      if (err1) console.log(err1);
      res.render('admin-maintain/views/supplier', {re: results1});

  });
});

router.get('/supplierForm',(req,res)=>{
  db.query(`Select * from tblUser order by intUserID desc limit 1`,(err1,results1,fields1)=>{
      if (err1) console.log(err1);

      db.query(`Select * from tblbusinesstype where intStatus = 1`,(err2,results2,fields2)=>{
        if (err2) console.log(err2);

        var lastnum = "1000";
        if (results1 == null || results1 == undefined){

        }else if(results1.length == 0){

        }else{
          lastnum = parseInt(results1[0].intUserID) + 1;
        }
        console.log(lastnum);
        res.render('admin-maintain/views/supplierForm', {lastsupplier: lastnum, businesstype: results2});

      });

  });
});

router.post('/addSupplier',(req,res)=>{
  var no = "1000";
  db.beginTransaction(function(err){
    if(err){db.rollback(function(){console.log(err)})}
    else{
      db.query(`Select * from tblUser order by intUserID desc limit 1`,(err1,results1,fields1)=>{
        if(err1){db.rollback(function(){console.log(err1)})}
        else{
          if(results1 == null || results1 == undefined){} else if (results1.length == 0){}
          else{
            no = parseInt(results1[0].intUserID) +1;
          }
          db.query(`Insert into tblUser (intUserID, intUserTypeNo, strFName, strMName, strLName, strEmail) values ("${no}",2,"${req.body.fname}","${req.body.mname}","${req.body.lname}","${req.body.email}")`,(err2,results2,fields2)=>{
            if(err2) {db.rollback(function(){console.log(err2)})}
            else{
              db.query(`Insert into tblSupplier (intUserID, intBusinessTypeNo, strBrands, strBusinessName, strBusinessEmail,strBusinessAddress,strSupplierPhone,strSupplierMobile,strBusinessTIN, intInvoiceAvailable, intSupplierType) values ("${no}","${req.body.busstype}","${req.body.brands}","${req.body.bname}","${req.body.email}","${req.body.address}","${req.body.phone}","${req.body.mobile}","${req.body.tin}","${req.body.inv}",${req.body.supptype})`,(err3,results3,fields3)=>{
                if (err3) {db.rollback(function(){console.log(err3)})}
                else{
                  db.commit(function(erra){
                    if (erra) {db.rollback(function(){console.log(erra)})}
                    else{
                      res.send("yes");
                    }
                  })
                }
              });
            }
          })
        }
      });
    }
  });

});

router.post('/inactivateSupplier',(req,res)=>{
  db.query(`Update tblSupplier set intStatus = 0 where intUserID = "${req.body.no}"`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);
    if(!err1) res.send("yes");
  });
})

router.post('/activateSupplier',(req,res)=>{
  db.query(`Update tblSupplier set intStatus = 1 where intUserID = "${req.body.no}"`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);
    if(!err1) res.send("yes");
  });
})

// Product Category --------------------------
router.get('/productCategory', (req,res)=>{
  db.query(`Select * from tblcategory`, (err1,results1,fields1)=>{
    if (err1) console.log(err1);
    db.query(`Select tblSubCategory.intStatus as S, tblCategory.*, tblSubcategory.* from tblSubcategory join tblCategory on tblSubcategory.intCategoryNo = tblCategory.intCategoryNo`,(err2,results2,fields2)=>{
      if (err2) console.log(err2);
      res.render('admin-maintain/views/category', {category: results1, sub: results2});

    });

  });
});

router.post('/inactivateCategory',(req,res)=>{
  db.query(`Update tblCategory set intStatus = 0 where intCategoryNo = "${req.body.no}"`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);
    if (!err1) res.send("yes");
  });
});

router.post('/activateCategory',(req,res)=>{
  db.query(`Update tblCategory set intStatus = 1 where intCategoryNo = "${req.body.no}"`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);
    if (!err1) res.send("yes");
  });
});

router.post('/inactivateSubCategory',(req,res)=>{
  db.query(`Update tblSubCategory set intStatus = 0 where intSubCategoryNo = "${req.body.no}"`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);
    if (!err1) res.send("yes");
  });
});

router.post('/activateSubCategory',(req,res)=>{
  db.query(`Update tblSubCategory set intStatus = 1 where intSubCategoryNo = "${req.body.no}"`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);
    if (!err1) res.send("yes");
  });
});

router.post('/addCategory',(req,res)=>{
  // query last category note
  var num = 1000;
  db.query(`Select * from tblCategory order by intCategoryno desc limit 1`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);

    if(results1 == null || results1 == undefined || results1.length == 0){

    }else{
      num = parseInt(results1[0].intCategoryNo) +1;
    }

    db.query(`Insert into tblCategory (intCategoryNo, intAdminID, strCategory) values ("${num}","1000","${req.body.category}")`, (err2,results2,fields2)=>{
      if (err2) console.log(err2);

      res.redirect('/maintenance/productCategory');
    });
  });
});

router.post('/addSubCategory', (req,res)=>{

  var num = 1000;
  // query last record of subCategory
  db.query(`Select * from tblSubCategory order by intSubCategoryNo desc limit 1`, (err1,results1,fields1)=>{
    if (err1) console.log(err1);


    if (results1 == null || results1 == undefined || results1.length == 0){

    }else{
      num = parseInt(results1[0].intSubCategoryNo) + 1;
    }

    db.query(`Insert into tblSubCategory (intSubCategoryNo, intCategoryNo, strSubCategory) values ("${num}", "${req.body.categ}", "${req.body.subcategory}")`,(err3,results3,fields3)=>{
      if (err3) console.log(err3);

      res.redirect('/maintenance/productCategory');
    });
  });
});



// Business Type -------------------
router.get('/businessType', (req,res)=>{
  db.query(`Select * from tblbusinesstype`,(err1,results1,fields1)=>{
    if (err1) console.log(err2);
    db.query(`Select * from tblbusinesstype order by intbusinesstypeno desc limit 1`,(err2,results2,fields2)=>{
      if (err2) console.log(err2);
      res.render('admin-maintain/views/businessType', {re: results1, moment:moment, lasttype: results2});
    });
  });
});

router.post('/addBusinessType',(req,res)=>{
  db.query(`Insert into tblbusinesstype (intBusinessTypeNo,intAdminID, strBusinessType) values ("${req.body.bno}", "1000","${req.body.btype}")`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);
    if (!err1) res.send("yes");
  });
});

router.post('/inactivateType',(req,res)=>{
  db.query(`Update tblBusinessType set intStatus = 0 where intBusinessTypeNo = "${req.body.no}"`,(err1,results1,fields1)=>{
    if(err1) console.log(err1);
    if(!err1) res.send("yes");
  });
});

router.post('/activateType',(req,res)=>{
  db.query(`Update tblBusinessType set intStatus = 1 where intBusinessTypeNo = "${req.body.no}"`,(err1,results1,fields1)=>{
    if(err1) console.log(err1);
    if(!err1) res.send("yes");
  });
});


// FAQ --------------------------------
router.get('/FAQ', (req,res)=>{
  db.query(`Select * from tblfaq`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);
    db.query(`Select * from tblfaq order by intfaqno desc limit 1`,(err2,results2,fields2)=>{
      if (err2) console.log(err2);
      var num = "1000";
      if (results2 == null || results2 == undefined){

      }else if (results2.length == 0){

      }else{
        num = parseInt(results2[0].intFaqNo) + 1;
      }
      res.render('admin-maintain/views/FAQ', {re: results1, lastfaq: num });

    });

  });
});

router.post('/addFaq',(req,res)=>{
  db.query(`Insert into tblfaq (intFaqNo, strQuestion, strAnswer) values ("${req.body.fno}", "${req.body.question}", "${req.body.answer}")`,(err1,results1,fields1)=>{
    if (err1){
     console.log(err1);
     res.send("no");
    }
    if (!err1) res.send("yes");
  });
});

router.post('/inactivateFaq',(req,res)=>{
  db.query(`Update tblFaq set intStatus = 0 where intFaqNo = "${req.body.no}"`,(err1,results1,fields1)=>{
    if(err1) console.log(err1);
    if(!err1) res.send("yes");
  });
});

router.post('/activateFaq',(req,res)=>{
  db.query(`Update tblFaq set intStatus = 1 where intFaqNo = "${req.body.no}"`,(err1,results1,fields1)=>{
    if(err1) console.log(err1);
    if(!err1) res.send("yes");
  });
});


 // Promotion --------------------------------
router.get('/promotion', (req,res)=>{
  db.query(`Select * from tblPromo`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);
    db.query(`Select * from tblpromo order by intPromoNo limit 1`,(err2,results2,fields2)=>{
      if (err2) console.log(err2);
      res.render('admin-maintain/views/promotion',{re: results1, moment: moment, lastpromo: results2});
    });
  });
});

router.post('/addPromotion',(req,res)=>{
  db.query(`Insert into tblPromo (intPromoNo, intAdminID, strProductCode, strPromoName, discount, date_end, strPromoDescription) values ("${req.body.pno}","1000","${req.body.pcode}","${req.body.pname}","${req.body.pdiscount}","${req.body.pdue}","${req.body.pdesc}")`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);
    if (!err1) res.send("yes");
  });
});

router.get('/promotionList',(req,res)=>{
  var promono = req.query.promo;
  db.query(`Select * from tblpromolist
    join tblpromo on tblpromo.intpromono = tblpromolist.intpromono
    join tblproductinventory on tblpromolist.intinventoryno = tblproductinventory.intinventoryno
    join tbluser on tbluser.intuserid = tblproductinventory.intuserid
    where tblpromolist.intpromono = ${promono}`, (err1,results1,fields1)=>{
      if (err1) console.log(err1);

      // product list
      db.query(`Select * from tblproductinventory
        join tblproductlist on tblproductinventory.intproductno = tblproductlist.intproductno
        join tbluser on tblproductinventory.intuserid = tbluser.intuserid
        join tblproductbrand on tblproductlist.intbrandno = tblproductbrand.intbrandno
        join tbluom on tblproductinventory.intuomno = tbluom.intuomno
        where tblproductinventory.intPromotype = 1
        and tblproductinventory.intinventoryno not in (Select intInventoryno from tblpromolist)`,(err2,results2,fields2)=>{
          if (err2) console.log(err2);

          res.render('admin-maintain/views/promolist', {re: results1, promo: promono, productlist: results2});

        });

  });
});

router.post('/addToPromo',(req,res)=>{
  db.query(`Select * from tblpromolist order by intpromolistno desc limit 1`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);
    var num = "1000";
    if (results1 == null || results1 == undefined){

    }else if (results1.length == 0){

    }else{
      num = parseInt(results1[0].intPromoListNo) + 1;
    }
    db.query(`Insert into tblpromolist (intPromoListno, intPromoNo, intInventoryNo) values("${num}","${req.body.pno}","${req.body.ino}")`,(err2,results2,fields2)=>{
      if (err2) console.log(err2);

      if (!err2) res.send("yes");
    });

  });
});

router.post('/inactivatePromo',(req,res)=>{
  db.query(`Update tblPromo set intStatus = 0 where intPromoNo = "${req.body.intPromoNo}"`,(err1,results1,fields1)=>{
    if(err1) console.log(err1);
    if (!err1) res.send("yes");
  })
});

router.post('/activatePromo',(req,res)=>{
  db.query(`Update tblPromo set intStatus = 1 where intPromoNo = "${req.body.intPromoNo}"`,(err1,results1,fields1)=>{
    if(err1) console.log(err1);
    if (!err1) res.send("yes");
  })
});

 // Package -------------------------------
router.get('/package', (req,res)=>{
  db.query(`Select * from tblpackage`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);

      res.render('admin-maintain/views/package',{re: results1, moment: moment});


  });
});

router.post('/addPackage',(req,res)=>{
  db.query(`Select * from tblpackage order by intPackageNo desc limit 1`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);

    var num = "1000";
    if (results1 == null || results1 == undefined){

    }else if (results1.length == 0){

    }else{
      num = parseInt(results1[0].intPackageNo) + 1;
    }

    db.query(`Insert into tblpackage (intPackageNo, intAdminID, strPackageName, strPackageDescription, packagePrice, dateDue) values ("${num}","1000","${req.body.pname}","${req.body.pdesc}",${req.body.pprice}, "${req.body.pdue}")`,(err2,results2,fields2)=>{
      if (err2) console.log(err2);
      if (!err2) res.send("yes");
    });
  })
});

router.get('/packageList',(req,res)=>{
  var pack = req.query.package;

  db.query(`Select * from tblpackagelist
    join tblproductinventory on tblpackagelist.intinventoryno = tblproductinventory.intinventoryno
    join tblproductlist on tblproductlist.intproductno = tblproductinventory.intproductno
    join tbluom on tblproductinventory.intuomno = tbluom.intuomno
    join tbluser on tblproductinventory.intuserid = tbluser.intuserid
    where tblpackagelist.intpackageno = ${pack}`,(err1,results1,fields1)=>{
      if (err1) console.log(err1);

      res.render('admin-maintain/views/packagelist',{re:results1, moment: moment, package: pack});
    });
});

router.post('/inactivatePackage',(req,res)=>{
  db.query(`Update tblPackage set intStatus = 0 where intPackageNo = "${req.body.no}"`,(err1,results1,fields1)=>{
    if(err1) console.log(err1);
    if(!err1) res.send("yes");
  })
});

router.post('/activatePackage',(req,res)=>{
  db.query(`Update tblPackage set intStatus = 1 where intPackageNo = "${req.body.no}"`,(err1,results1,fields1)=>{
    if(err1) console.log(err1);
    if(!err1) res.send("yes");
  })
});

// Measuremens ------------------------------------
router.get('/measurements', (req,res)=>{
  db.query(`Select * from tblUom`, (err1,results1,fields1)=>{
    if (err1) console.log(err1);
    res.render('admin-maintain/views/measurements', {re: results1, moment: moment});
  });
});

router.post('/addMeasurement', (req,res)=>{
  var num = 1000;
  // Select last record
  db.query(`Select * from tbluom order by intUomNo desc limit 1`, (err1,results1,fields1)=>{
    if (err1) console.log(err1);

    if (results1 == null || results1 == undefined || results1.length == 0){

    }else{
      num = parseInt(results1[0].intUomNo)+1;
    }

    db.query(`Insert into tblUom (intUomNo,intUserID,strUnitName) values ("${num}", "1000", "${req.body.measurement}")`, (err2,results2,fields2)=>{
      if (err2) console.log(err2);

      res.redirect('/maintenance/measurements');
    });
  });
});

router.post('/inactivateUom',(req,res)=>{
  db.query(`Update tblUom set intStatus = 0 where intUomNo = "${req.body.no}"`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);
    if (!err1) res.send("yes");
  });
});

router.post('/activateUom',(req,res)=>{
  db.query(`Update tblUom set intStatus = 1 where intUomNo = "${req.body.no}"`,(err1,results1,fields1)=>{
    if (err1) console.log(err1);
    if (!err1) res.send("yes");
  });
});


// Customer -------------------------------------
router.get('/customer', (req,res)=>{
  db.query(`SELECT tblcustomer.intStatus as Stats, tblUser.*,tblcustomer.* from
    tblUser join tblcustomer on tblUser.intUserID =
    tblcustomer.intUserID`,(err1,results1)=>{
      if (err1) console.log(err1);
      res.render('admin-maintain/views/customer', {re: results1});


  });
});

// Certification --------------------------------
router.get('/productCertification',(req,res)=>{
  db.query(`Select * from tblProductCertification`,(err1,results1,fields1)=>{
    if(err1) console.log(err1);
    res.render('admin-maintain/views/certifications',{certification: results1});
  });
});

router.post('/addCertification',(req,res)=>{
  var certno = "1000";
  db.query(`Select * from tblProductCertification order by intCertificationNo desc limit 1`,(err1,results1,fields1)=>{
    if(err1) console.log(err1);

    if(results1 == null || results1 == undefined){

    }else if(results1.length == 0){

    }else{
      certno = parseInt(results1[0].intCertificationNo) + 1;
    }

    db.query(`Insert into tblProductCertification (intCertificationNo, strCertification) values ("${certno}", "${req.body.certification}")`, (err2,results2,fields2)=>{
      if (err2) console.log(err2);
      res.send("yes");
    })
  });
});

router.post('/activateCertification',(req,res)=>{
  db.query(`Update tblProductCertification set intStatus = 1 where intCertificationNo = "${req.body.no}"`,(err1,results1,fields1)=>{
    if(err1) console.log(err1);
    if(!err1) res.send("yes");
  });
});

router.post('/inactivateCertification',(req,res)=>{
  db.query(`Update tblProductCertification set intStatus = 0 where intCertificationNo = "${req.body.no}"`,(err1,results1,fields1)=>{
    if(err1) console.log(err1);
    if(!err1) res.send("yes");
  });
});
// <%- include('../../../templates/admin-navbar.ejs') -%>

exports.maintenance = router;
