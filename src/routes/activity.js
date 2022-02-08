const router = require('express').Router();
const { Op } = require('sequelize');
const { Activity, Country } = require('../db.js');

router.post('/', async function (req, res) {
	const { name, difficulty, duration, season, countries } = req.body;
	try {
		if (!Object.keys(req.body).length) res.status(400).json({ error: 'Invalid Input' });
		const activity = await Activity.create({ name, difficulty, duration, season });
		console.log('Activity created successfully.');

		let queries = countries.map((country) => {
			return Country.findOne({
				where: {
					name: {
						[Op.iLike]: country,
					},
				},
			});
		});
		queries = await Promise.all(queries).then((results) => results).catch((error) => console.error(error));
		queries.forEach((country) => {
			country.addActivity(activity);
		});

		res.status(201).json(activity);
	} catch (error) {
		console.log(error);
		res.sendStatus(400);
	}
});

router.get('/', async (req, res) => {
	const { country } = req.query;
	if (country) {
		try {
			const results = await Activity.findAll({
				include: [
					{
						model: Country,
						through: {
							where: { countryId: country },
						},
					},
				],
			}).catch(err => console.log(err));
			results.length ? res.json(results) : res.status(404).send('No activities found.');
			return;
		} catch (err) {
			console.log(err);
			res.status(400).send(err);
		}
	}

	const results = await Activity.findAll()
	res.send(results);
});

module.exports = router;
