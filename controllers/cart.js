const Cart = require("../models/cart");

function runUpdate(condition, updateData) {
  return new Promise((resolve, reject) => {
    //you update code here

    Cart.findOneAndUpdate(condition, updateData, { upsert: true })
      .then((result) => resolve())
      .catch((err) => reject(err));
  });
}

exports.addItemToCart = (req, res) => {

  Cart.findOne({ user: req.user._id }).exec((error, cart) => {
   // console.log("item",cart)
    if (error) return res.status(400).json({ error });
    if (cart) {
      //if cart already exists then update cart by quantity
      let promiseArray = [];

      req.body.cartItems.forEach((cartItem) => {

        const product = cartItem.product;
        const item = cart.cartItems.find((c) => c.product == product);

        let condition, update;

        if (item) {
          condition = { user: req.user._id, "cartItems.product": product };
          update = {
            $set: {
              "cartItems.$": cartItem,
            },
          };
        } else {
          condition = { user: req.user._id };
          update = {
            $push: {
              cartItems: cartItem,
            },
          };
        }
        promiseArray.push(runUpdate(condition, update));
        //Cart.findOneAndUpdate(condition, update, { new: true }).exec();
        // .exec((error, _cart) => {
        //     if(error) return res.status(400).json({ error });
        //     if(_cart){
        //         //return res.status(201).json({ cart: _cart });
        //         updateCount++;
        //     }
        // })
      });
  
      Promise.all(promiseArray)
        .then((response) =>  {
          console.log("response ",response)
        res.status(201).json({ response })})
        .catch((error) => res.status(400).json({ error }));
    } else {
      //if cart not exist then create a new cart
   
      const cart = new Cart({
        user: req.user._id,
        cartItems: req.body.cartItems,
   
      });
//      console.log("cart ",cart)
      cart.save((error, cart) => {
        if (error) return res.status(400).json({ error });
        if (cart) {
          return res.status(201).json({ cart });
        }
      });
    }
  });
};


exports.getCartItems = (req, res) => {
  //const { user } = req.body.payload;
  //if(user){
 //console.log(req.user._id );
  Cart.findOne({ user: req.user._id })
    .populate("cartItems.product", "_id name discountPrice offer deliveryDay actualPrice productPictures")
    .exec((error, cart) => {
    // console.log("item 2",cart)
      if (error) return res.status(400).json({ error });
      if (cart) {
        let cartItems = {};
        cart.cartItems.forEach((item, index) => {
          cartItems[item.product._id.toString()] = {
            _id: item.product._id.toString(),
            name: item.product.name,
            img: item.product.productPictures[0].img,
            price: item.product.actualPrice,
            discountPrice: item.product.discountPrice,
            offer : item.product.offer,
            deliveryDay: item.product.deliveryDay,
            qty: item.quantity,
          
          };
        });
        res.status(200).json({ cartItems });
      }
    });
  //}
};

// new update remove cart items

exports.removeCartItems = (req, res) => {
  const { productId } = req.body;
 // console.log(req.user._id );
  if (productId) {
    Cart.updateOne(
      { user: req.user._id },
      {
        $pull: {
          cartItems: {
            product: productId,
          },
        },
      }
    ).exec((error, result) => {
      if (error) return res.status(400).json({ error });
      if (result) {
        res.status(202).json({ result });
      }
    });
  }
};
