const test = require("node:test");
const assert = require("node:assert/strict");
const { riskFromClimate, irrigationRecommendation, estimateConsumption, interpretLeaf } = require("../server");
test("classifica estiagem severa como crítica", () => assert.equal(riskFromClimate({daysWithoutRain:12,temperature:36,humidity:25,rainfall:2}).level, "critical"));
test("evita irrigação no horário quente", () => assert.match(irrigationRecommendation({crop:"alface",temperature:35,humidity:30,forecastRain:0,hour:14}), /Evite irrigar/));
test("estima consumo residencial", () => assert.equal(estimateConsumption({residents:2,showers:1,laundry:0,hose:false}), 200));
test("identifica folha saudável (verde)", () => assert.match(interpretLeaf({red:50,green:150,blue:50,crop:"alface"}).text, /saudável/));
test("identifica folha estressada (amarelada)", () => assert.match(interpretLeaf({red:150,green:150,blue:50,crop:"alface"}).text, /estresse/));
