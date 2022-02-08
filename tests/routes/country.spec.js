/* eslint-disable import/no-extraneous-dependencies */
const { expect } = require('chai');
const session = require('supertest-session');
const app = require('../../src/app.js');
const { Country, Activity, conn } = require('../../src/db.js');

const agent = session(app);
const country = {
  id: 'ARG',
  name: 'Argentina',
  flag: 'https://flagcdn.com/aw.svg',
  continent: 'Americas',
  capital: 'Buenos Aires',
};

describe('Country Routes', () => {
  before(() => conn.authenticate()
  .catch((err) => {
    console.error('Unable to connect to the database:', err);
  }));
  beforeEach(() => {
    Country.sync({ force: true })
  });
  describe('GET /countries', () => {
    it('Should get 200', () => {
      agent.get('/countries').expect(200)
    }
    ).timeout(4000);

    it('Loads the countries into the database', async () => {
      await agent.get('/countries');
      const db_countries = await Country.findAll();
      expect(db_countries.length).to.equal(250);
    }).timeout(4000);

    describe('GET /countries/:countryId', async () => {
      
    })
  });
});

const activity = {
  name: 'Skydiving',
  difficulty: 2, //from 1 to 5
  duration: 120, //minutes
  season: 'summer',
}

describe('Activity Routes',() => {
  before(() => conn.authenticate()
  .catch((err) => {
    console.error('Unable to connect to the database:', err);
  }));
  describe('POST /activity', () => {
    it('Responds with 201 when creation is successful.', async () => {
      const response = await agent.post('/activity').send(activity);
      expect(response.status).equal(201);;
    })
    it('Returns a JSON with the created activity.', async () => {
      const response = await agent.post('/activity').send(activity);
      const { name, difficulty, duration, season } = response.body;
      expect(name).to.equal('Skydiving');
      expect(difficulty).to.equal(2);
      expect(duration).to.equal(120);
      expect(season).to.equal('summer');
    })
    it('Returns 400 and an error when an invalid object is passed', async () => {
      const response = await agent.post('/activity').send({});
      expect(response.status).equal(400);
      expect(response.body).to.have.all.keys('error');
    })
    it('Adds the activity to the database', async () => {
      const response = await agent.post('/activity').send(activity);
      const db_query = await Activity.findOne({
        where: { name: activity.name },
      });
      expect(db_query).to.not.be.undefined;
    })
  })
})