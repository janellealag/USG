var router = require('express').Router();
var db = require('../../lib/database')();
var moment = require('moment');

router.get('/', (req,res)=>{
  res.render('admin-queries/views/queries');
});

router.get('/allProducts',(req,res)=>{
  db.query(`Select * from tblProductList`,(err1,res1,fie1)=>{
    if(err1) console.log(err1);
    else{
      res.render('admin-queries/views/allProducts',{productss: res1})
    }
  })
});

var result ="", string = 0;

router.get('/loader',(req,res)=>{
  if(string == 2){
    res.render('admin-queries/views/inventoryTransactions',{re: result, moment: moment})
  }
  else if(string == 3){
    res.render('admin-queries/views/stockPullOut',{re: result, moment: moment})

  }
  else if(string == 4){
    res.render('admin-queries/views/productBatch',{re: result, moment: moment})

  }
  else{

  }

})

router.post('/search',(req,res)=>{

  // var dates = (req.body.date).split('-');
  // var newDate = moment(dates[0]).format("YYYY/MM/DD");
  // var newDate1 = moment(dates[1]).format("YYYY/MM/DD");

  // Select * from tblInventoryTransactions
  //   join tblProductInventory on tblInventoryTransactions.intInventoryno = tblProductinventory.intInventoryno
  //   join tblProductlist on tblProductlist.intProductNo = tblProductInventory.intProductNo
  //   join tblUom on tblUom.intUOMno = tblProductInventory.intUomNo
  //    where transactionDate between '${newDate}' and '${newDate1}'

  // inventory transactions
  if(req.body.string == 2){

    db.query(`Select * from tblProductinventory join tblInventoryTransactions
      on tblproductinventory.intInventoryno = tblInventoryTransactions.intInventoryno
      join tblProductList on tblProductInventory.intProductNo = tblProductList.intProductNo
      join tbluom on tbluom.intUOMno = tblProductInventory.intUOMno
      where tblProductInventory.intInventoryno = 1000`,(e,r,f)=>{
      if(e) console.log(e);
      else{
        result = r;
        string = 2;
        res.send("yes");
      }
    })
  }

  // stock pull out
  if(req.body.string == 3){
    db.query(`Select * from tblStockPullOut
      join tblProductInventory on tblStockPullOut.intInventoryno = tblProductInventory.intInventoryno
      join tblProductlist on tblProductlist.intProductNo = tblProductInventory.intProductNo
      join tblUom on tblUom.intUOMno = tblProductInventory.intUomNo`,(e1,r1,f1)=>{
         if(e1) console.log(e1);
         else{
           result = r1;
           string = 3;
           res.send("yes");
         }
       })

  }

  // product Batch
  if(req.body.string == 4){
    db.query(`Select tblBatch.intQuantity as qty, tblBatch.*, tblProductInventory.*,
      tblProductList.*, tblUom.*
       from tblBatch join tblProductInventory on tblBatch.intInventoryno = tblProductInventory.intInventoryno
       join tblProductlist on tblProductlist.intProductNo = tblProductInventory.intProductNo
       join tblUom on tblUom.intUOMno = tblProductInventory.intUomNo`,(e2,r2,f2)=>{
          if(e2) console.log(e2);
          else{
            result = r2;
            string = 4;
            res.send("yes");
          }
        })
  }
})

// <%- include('../../../templates/admin-navbar.ejs') -%>

exports.queries = router;
