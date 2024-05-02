const express = require("express");
const cors = require("cors");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

const app = express();
app.use(cors({ origin: true }));

var serviceAccount = require("./privatekey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Middleware to log incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${JSON.stringify(req.body)}`);
  next();
});

// Route to add a new product
app.post("/api/addProduct", async (req, res) => {
  // Validate input data
  if (
    !req.body.title ||
    !req.body.description ||
    !req.body.price ||
    !req.body.discountPercentage ||
    !req.body.rating ||
    !req.body.stock ||
    !req.body.brand ||
    !req.body.category ||
    !req.body.thumbnail ||
    !req.body.images
  ) {
    return res.status(400).send("Missing required fields");
  }

  // Generate a unique ID for the product
  const productId = admin.firestore().collection("products").doc().id;

  // Prepare the product data
  const productData = {
    id: productId,
    title: req.body.title,
    description: req.body.description,
    price: req.body.price,
    discountPercentage: req.body.discountPercentage || 0,
    rating: req.body.rating || 0,
    stock: req.body.stock || 0,
    brand: req.body.brand || "",
    category: req.body.category || "",
    thumbnail: req.body.thumbnail || "",
    images: req.body.images || [],
  };

  // Add the product to Firestore
  try {
    await admin
      .firestore()
      .collection("products")
      .doc(productId)
      .set(productData);
    res.status(201).send(`Product added with ID: ${productId}`);
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).send("Failed to add product");
  }
});

// Route to get products with soecific search qury and pagination

app.get("/api/getProducts", async (req, res) => {
  const pageSize = parseInt(req.query.pageSize) || 10;
  const pageToken = req.query.pageToken;
  const searchText = req.query.searchText || "";

  let query = admin.firestore().collection("products");

  // If a search text is provided, filter the products by title
  if (searchText) {
    query = query
      .where("title", ">=", searchText)
      .where("title", "<=", searchText + "\uf8ff");
  }

  // If a page token is provided, start the query after that document
  if (pageToken) {
    const lastVisible = await admin
      .firestore()
      .doc(`products/${pageToken}`)
      .get();
    query = query.startAfter(lastVisible).limit(pageSize);
  } else {
    query = query.limit(pageSize);
  }

  try {
    const snapshot = await query.get();
    const products = [];
    snapshot.forEach((doc) => {
      products.push({ id: doc.id, data: doc.data() });
    });

    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Failed to fetch products");
  }
});

// Route to update a Specific product with ID
app.put("/api/updateProduct/:id", async (req, res) => {
  // Validate input data ensuring that the required fields are present.
  if (!req.body) {
    return res.status(400).send("Missing required fields");
  }

  // Debugging: Log the ID
  console.log("ID:", req.params.id);

  // If ID is not provided, return an error
  if (!req.params.id) {
    return res.status(400).send("Missing product ID");
  }

  // Prepare the product data fields
  const productData = {
    title: req.body.title,
    description: req.body.description,
    price: req.body.price,
    discountPercentage: req.body.discountPercentage || 0,
    rating: req.body.rating || 0,
    stock: req.body.stock || 0,
    brand: req.body.brand || "",
    category: req.body.category || "",
    thumbnail: req.body.thumbnail || "",
    images: req.body.images || [],
  };

  // Update the product in Firestore
  try {
    await admin
      .firestore()
      .collection("products")
      .doc(req.params.id)
      .update(productData);
    res.status(200).send(`Product updated with ID: ${req.params.id}`);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).send("Failed to update product");
  }
});

//  Route to delete a specific product with ID
app.delete("/api/deleteProduct/:id", async (req, res) => {
  const { id } = req.params;

  // Validate input data
  if (!id) {
    return res.status(400).send("Missing product ID");
  }

  // Check if the product ID exists
  try {
    await admin.firestore().collection("products").doc(id).get();
  } catch (error) {
    return res.status(404).send("Product not found");
  }

  // Delete the product from Firestore
  try {
    await admin.firestore().collection("products").doc(id).delete();
    res.status(200).send(`Product deleted with ID: ${id}`);
  } catch (error) {
    // Log the error for debugging
    console.error("Error deleting product:", error);
    // send a 500 error response to the client
    res.status(500).send("Failed to delete product");
  }
});

// Route to get products based on specified price range
app.get("/api/rangeProducts", async (req, res) => {
  // Extract the minPrice and maxPrice query parameters
  const { minPrice, maxPrice } = req.query;

  // Validate input data
  if (!minPrice || !maxPrice) {
    return res.status(400).send("Missing required fields");
  }

  try {
    // Query Firestore for products within the specified price range
    const query = admin
      .firestore()
      .collection("products")
      .where("price", ">=", parseInt(minPrice))
      .where("price", "<=", parseInt(maxPrice));

    // Execute the query and fetch the results
    const querySnapshot = await query.get();

    const products = [];

    // Loop through the query results and push them to the products array
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, data: doc.data() });
    });
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Failed to fetch products");
  }
});

exports.app = functions.https.onRequest(app);

// export const addProduct = funcstions.hhtps.onRequest(async (req,res) => {});
