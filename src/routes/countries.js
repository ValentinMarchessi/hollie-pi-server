const router = require('express').Router();
const axios = require('axios');
const { Op, Sequelize } = require('sequelize');
const { Country, Activity } = require('../db.js')

router.get('/', async function (req, res) {
    const { name, page, orderBy, direction, filter, filterValue } = req.query;
    const countryCount = await Country.count();
    if (countryCount === 0) {
		console.log('Countries table is empty, fetching countries from external API.');
		const { data } = await axios('https://restcountries.com/v3/all');
		data.forEach(function (country) {
			const { cca3, name, flags, region, capital, population } = country;
            Country.findOrCreate({
                where: { id: cca3 },
                defaults: {
                    id: cca3,
                    name: name.common,
                    flag: flags[0],
                    continent: region,
                    capital: capital ? capital[0] : 'unavailable',
                    population,
                }
			}).catch((err) => console.error(err));
		});
		console.log('Syncing countries table...');
		await Country.sync({ alter: true });
	}

    if (Object.keys(req.query).length) {
        if (name) {
            try {
                const query_result = await Country.findAll({
                    where: {
                        name: {
                            [Op.iLike]: `${name}%`,
                        },
                    }
                }).catch(err => console.error(err));
                query_result.length ?
                    res.json(query_result) :
                    res.status(400).json({ error: 'Could not find countries for the given query.' });
            } catch (err) {
                console.error(err);
                res.status(400).send(err);
            }
        }
        if (page) {
            let options = {
                offset: page > 1 ? 9 + 10 * (page - 1) : 0,
                limit: page > 1 ? 10 : 9,
            };

            if (orderBy) options = { ...options, order: [[orderBy, direction ? direction : "DESC"]] };

            /*
                Si filterValue tiene espacios en la url estos son reemplazados por %20, esto corrige los espacios
                para poder hacer el request a la base de datos
            */
            
            if (filter === 'Continent') options = {
                ...options,
                where: { continent: filterValue }
            };
            if (filter === 'Activity') options = {
                ...options,
                include: [
                    {
                        model: Activity,
                        where: { id: filterValue }
                    }]
            }
            const { count, rows } = await Country.findAndCountAll(options).catch(function (err) {
				console.log(err);
			});
            count ? res.status(200).send({
                content: rows,
                count: count,
            })
                : res.status(404).send('No countries found for the given query.');
        }
        if(!name && !page) res.status(400).send('Invalid Query');
    }
    else try { 
        country_array = await Country.findAll({
            attributes: ['name']
        }).then(countries => countries.map(country => country.name));
        country_array.length ? res.status(200).json(country_array) : res.sendStatus(400);
    } catch (error) {
        console.error(error);
        res.sendStatus(400);
    }
})

router.get('/continents', async function (req, res) {
	const continents = await Country.findAll({
		attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('continent')),'continent']],
	}).then(continents => continents.map(entry => entry.continent)).catch((err) => console.log(err));
	continents.length ? res.json(continents) : res.sendStatus(400);
});

router.get('/:countryId', async function (req, res){
    try {
        const { countryId } = req.params;
        const {
            cca3, 
            name,
            flags,
            region,
            capital,
            subregion,
            area,
            population ,
        } = await axios.get(`https://restcountries.com/v3/alpha/${countryId}`).then(({data}) => data[0]);
        const activities = await Country.findOne({ where: { id: countryId } }).then(country => country.getActivities()).catch(err => []);

        cca3 ? res.json({
            id: cca3,
            name: name.common,
            flag: flags[0],
            continent: region,
            capital: capital ? capital[0] : 'Unavailable',
            subregion,
            area,
            population,
            activities
        })
            : res.sendStatus(400);
    }
    catch (error) {
        console.error(error);
        res.sendStatus(400);
    }
})

module.exports = router;