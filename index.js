// Lambda entry point
const Alexa = require('ask-sdk-core');
//const Movies = require('./src/handlers/movies');
const General = require('./src/handlers/general');

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
.addRequestHandlers(
   // Movies.findMovieIntentHander,
    General.launchRequestHandler
)
.lambda();