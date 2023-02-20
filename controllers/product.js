const Product = require("../models/product");
const shortid = require("shortid");
const slugify = require("slugify");
const Category = require("../models/category");

exports.createProduct = (req, res) => {
  //res.status(200).json( { file: req.files, body: req.body } );

  const {
    name,
    description,
    category,
    quantity,
    pincode,
    tags,
    actualPrice,
    discountPrice,

    deliveryDay,
    offer,

    createdBy,
  } = req.body;

  let productPictures = [];

  //let cakeDetails = [];

  if (req.files.length > 0) {
    productPictures = req.files.map((file) => {
      return { img: process.env.API + "/public/" + file.filename };
    });
  }

  if (category == "63e7408c4d118f475c8542c2") {
    const product = new Product({
      name: name,
      slug: slugify(name),
      actualPrice:
        actualPrice || req.body.halfkgprice
          ? actualPrice
          : req.body.halfkgprice,
      quantity,
      description,
      pincode,
      productPictures,
      category,
      offer,
      discountPrice,

      deliveryDay,

      halfkgprice: req.body.halfkgprice ? req.body.halfkgprice : "",
      onekgprice: req.body.onekgprice ? req.body.onekgprice : "",
      twokgprice: req.body.twokgprice ? req.body.twokgprice : "",
      tags,
      createdBy: req.user._id,
    });
    product.save((error, product) => {
      if (error) return res.status(400).json({ error });
      if (product) {
        res.status(201).json({ product, files: req.files });
      }
    });
  } else {
    const product = new Product({
      name: name,
      slug: slugify(name),
      actualPrice,
      quantity,
      description,
      pincode,

      discountPrice,

      deliveryDay,
      offer,
      productPictures,
      category,
      tags,
      createdBy: req.user._id,
    });
    product.save((error, product) => {
      if (error) return res.status(400).json({ error });
      if (product) {
        res.status(201).json({ product, files: req.files });
      }
    });
  }
};

exports.getProductsBySlug = (req, res) => {
  const { slug } = req.params;
  const { tag } = req.query;
  console.log(tag);
  Category.findOne({ slug: slug })
    .select("_id keyword")
    .exec((error, category) => {
      if (error) {
        return res.status(400).json({ error });
      }
      if (category) {
        Product.find({ category: category._id }).exec((error, products) => {
          if (error) {
            return res.status(400).json({ error });
          }

          let filterByTag = products.filter((product) =>
            product.tags.includes(tag)
          );

          if (products.length > 0) {
            res.status(200).json({
              products,
              filterByTag: filterByTag,
              priceRange: {
                under500: 499,
                under1000: 999,
                under1500: 1499,
                under2000: 1999,
                above2000: 2000,
              },
              productsByPrice: {
                under500: products.filter(
                  (product) => product.actualPrice < 500
                ),
                under1000: products.filter(
                  (product) =>
                    product.actualPrice > 500 && product.actualPrice <= 999
                ),
                under1500: products.filter(
                  (product) =>
                    product.actualPrice > 1000 && product.actualPrice <= 1499
                ),
                under2000: products.filter(
                  (product) =>
                    product.actualPrice > 1500 && product.actualPrice <= 1999
                ),
                above2000: products.filter(
                  (product) => product.actualPrice >= 2000
                ),
              },
            });
          } else {
            res.status(200).json({ products });
          }
        });
      }
    });
};

exports.getProductDetailsById = (req, res) => {
  const { productId } = req.params;

  if (productId) {
    Product.findOne({ _id: productId }).exec((error, product) => {
      if (error) return res.status(400).json({ error });

      if (product) {
        Product.find({ category: product.category }).exec(
          (error, similarProducts) => {
            if (error) {
              return res.status(400).json({ error });
            }
            else {
              res.status(200).json({ product, similarProducts: similarProducts });
            }
          }
        );
      }
    });
  } else {
    return res.status(400).json({ error: "Params required" });
  }
};

// new update
exports.deleteProductById = (req, res) => {
  const { productId } = req.body.payload;
  if (productId) {
    Product.deleteOne({ _id: productId }).exec((error, result) => {
      if (error) return res.status(400).json({ error });
      if (result) {
        res.status(202).json({ result });
      }
    });
  } else {
    res.status(400).json({ error: "Params required" });
  }
};

function createProducts(products) {
  const productList = [];

  for (let prod of products) {
    productList.push({
      _id: prod._id,
      pincode: prod.pincode,
      tags: prod.tags,
      name: prod.name,
      quantity: prod.quantity,
      description: prod.description,
      productPictures: prod.productPictures,
      actualPrice: prod.actualPrice,
      discountPrice: prod.discountPrice,

      reviews: prod.reviews,
      rating: prod.rating,
      numReviews: prod.numReviews,

      deliveryDay: prod.deliveryDay,
      category: prod.category,
      halfkgprice: prod.halfkgprice,
      onekgprice: prod.onekgprice,
      twokgprice: prod.twokgprice,
    });
  }

  return productList;
}
exports.getProducts = (req, res) => {
  Product.find({}).exec((error, product) => {
    if (error) return res.status(400).json({ error });
    if (product) {
      const products = createProducts(product);
      res.status(200).json({ products });
    }
  });
};

exports.createProductReview = async (req, res) => {
  const { rating, comment, name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }
  if (!rating) {
    return res.status(400).json({ error: "rating is required" });
  }
  if (!comment) {
    return res.status(400).json({ error: "comment is required" });
  }

  const product = await Product.findById(req.params.id);

  if (product) {
    const alreadyReviewed = product.reviews.find((r) => {
      return r.user.toString() === req.user._id.toString();
    });

    if (alreadyReviewed) {
      return res.status(400).json({ error: "Product already reviewed" });
    }

    const review = {
      name: name,
      rating: Number(rating),
      comment,
      user: req.user._id,
    };

    product.reviews.push(review);

    product.numReviews = product.reviews.length;

    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    res.status(201).json({ message: "Review added" });
  } else {
    res.status(404).json({ message: "Product not found" });
  }
};
