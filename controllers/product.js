const formidable = require('formidable');
const _ = require('lodash');
const fs = require('fs');
const Product = require('../models/product');
const { errorHandler } = require('../helpers/dbErrorHandler');

exports.create = (req, res) => {
	let form = new formidable.IncomingForm();
	form.keepExtensions = true;
	form.parse(req, (err, fields, files) => {
		if(err) {
			return res.status(400).json({
				error: 'Image could not be uploaded'
			});
		}

		// check for all files
		const {name, description, price, category, quantity, shipping} = fields;

		if(!name || !description || !price || !category || !quantity || !shipping) {
			return res.status(400).json({
				error: 'All fields are required.'
			});
		}

		let product = new Product(fields);

		if(files.photo) {
			// 1kb = 1000
			// 1mb = 1000000
			if(files.photo.size > 1000000) {
				return res.status(400).json({
					error: 'Image should be less than 1mb in size'
				});
			}
			product.photo.data = fs.readFileSync(files.photo.path);
			product.photo.contentType = files.photo.type;
		}
		product.save((err, result) => {
			if(err) {
				return res.status(400).json({
					error: errorHandler(err)
				})
			}
			res.json(result);
		})
	})
}

exports.productById = (req, res, next, id) => {
	Product.findById(id).exec((err, product) => {
		if(err || !product) {
			return res.status(400).json({
				error: 'Product not found!'
			});
		}
		req.product = product;
		next();
	})
}

exports.read = (req, res) => {
	req.product.photo = undefined;
	return res.json(req.product);
}

exports.remove = (req, res) => {
	let product = req.product;
	product.remove((err, deletedProduct) => {
		if(err) {
			return res.status(400).json({
				error: errorHandler(err)
			});
		}
		res.json({
			deletedProduct,
			message: 'Product deleted successfully'
		}); 
	})
}

exports.update = (req, res) => {
	let form = new formidable.IncomingForm();
	form.keepExtensions = true;
	form.parse(req, (err, fields, files) => {
		if(err) {
			return res.status(400).json({
				error: 'Image could not be uploaded'
			});
		}

		// check for all files
		const {name, description, price, category, quantity, shipping} = fields;

		if(!name || !description || !price || !category || !quantity || !shipping) {
			return res.status(400).json({
				error: 'All fields are required.'
			});
		}

		let product = req.product;
		product = _.extend(product, fields);

		if(files.photo) {
			// 1kb = 1000
			// 1mb = 1000000
			if(files.photo.size > 1000000) {
				return res.status(400).json({
					error: 'Image should be less than 1mb in size'
				});
			}
			product.photo.data = fs.readFileSync(files.photo.path);
			product.photo.contentType = files.photo.type;
		}
		product.save((err, result) => {
			if(err) {
				return res.status(400).json({
					error: errorHandler(err)
				})
			}
			res.json(result);
		})
	})
}

/**
 * sell / arrival
 * by sell = /products?sortBy=sold&order=desc&limit=4
 * by arrival = /products?sortBy=createdAt&order=desc&limit=4
 * 
 * if no params are sent, then all products are returned
 */

 exports.list = (req, res) => {
	let {order, sortBy, limit} = req.query;
	order = order ?? 'asc';
	sortBy = sortBy ?? '_id';
	limit = limit ? parseInt(limit) : 6;

	Product.find().select('-photo').populate('category').sort([[sortBy, order]]).limit(limit).exec((err, products) => {
		if(err) {
			return res.status(400).json({
				error: 'Products not found!'
			})
		}
		res.json(products);
	})
}

/**
 * It will find the products based on the req product category
 * other products that have the same category will be returned
 */

exports.listRelated = (req, res) => {
	let {limit} = req.query;
	limit = limit ? parseInt(limit) : 6;

	Product.find({_id: {$ne: req.product}, categroy: req.product.category})
	.populate('category', '_id name')
	.limit(limit)
	.exec((err, products) => {
		if(err) {
			return res.status(400).json({
				error: 'Products not found!'
			})
		}
		res.json(products);
	})
}

exports.listCategories = (req, res) => {
	Product.distinct('category', {}, (err, categories) => {
		if(err) {
			return res.status(400).json({
				error: 'Products not found!'
			})
		}
		res.json(categories)
	})
}