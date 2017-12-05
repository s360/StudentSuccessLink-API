'use strict';
/**
 * Created by zaenal on 01/10/15.
 */
var moment = require('moment');
var _ = require('underscore');
var l = require('lodash');
var gradeLevelAndSchoolYears = {};

/**
 *
 * @param xsre
 * @constructor
 */
function Assessment(xsre){

      this.assessments = null;

      this.collections = [];

      if(xsre.json) {

            if(xsre.json.assessments) {
                  this.assessments = xsre.json.assessments;
            }

      }

      this.config = xsre.config;

      //this.notAvailable = 'N/A';
      this.notAvailable = '';

      this.facets = xsre.facets;

      //build map of grade levels-enrollment dates
     

      gradeLevelAndSchoolYears[xsre.json.enrollment.gradeLevel] = xsre.json.enrollment.schoolYear;
      
      var otherEnrollments = l.get(xsre, 'json.otherEnrollments.enrollment', []);

      if (!_.isArray(otherEnrollments)) {
            otherEnrollments = [otherEnrollments];
      }

      otherEnrollments.forEach(function(enrollment){
            if (!gradeLevelAndSchoolYears[enrollment.gradeLevel]) {
                  gradeLevelAndSchoolYears[enrollment.gradeLevel] = enrollment.schoolYear
            }
      });
}
/**
 *
 * @returns {object}
 */
Assessment.prototype.getAssessment = function(){

      var me = this;

      if(null !== me.assessments) {

            me.processAssessment(me.assessments);

      }

      var collections = [];

      var collectionObjects = {};

      me.collections.forEach(function(collection){

            var key = String(collection.studentGradeLevel);

            if(key in collectionObjects){
                  collectionObjects[key].maps = collectionObjects[collection.studentGradeLevel].maps.concat(collection.maps);
                  collectionObjects[key].states = collectionObjects[collection.studentGradeLevel].states.concat(collection.states);
            } else {
                  collectionObjects[key] = {
                        schoolYear: collection.schoolYear,
                        studentGradeLevel: key,
                        maps: collection.maps,
                        states: collection.states
                  };
            }

      });

      Object.keys(collectionObjects).forEach(function(key){

            collections.push(collectionObjects[key]);

      });

      return _.sortBy(collections, 'studentGradeLevel').reverse();
};
/**
 *
 * @param assessments
 */
Assessment.prototype.processAssessment = function(assessments){

      var me = this;

      if(!_.isArray(assessments.assessment)){
            assessments.assessment = [ assessments.assessment ];
      }

      if(assessments.assessment && _.isArray(assessments.assessment)){
            
            assessments.assessment.forEach(function(assessment){

                  var collectionScoreSets = {
                        schoolYear: null,
                        testSeason: null,
                        localId: null,
                        schoolName: null,
                        studentGradeLevel: null,
                        maps: [],
                        states: []
                  };

                  var collectionState = {
                        subTestName: null,
                        subTestSubjectArea: null,
                        attemptCode: null,
                        attemptCodeDescription: null,
                        Score: null,
                        LevelCode: null,
                        MetStandard: null,
                        schoolName: null,
                        studentGradeLevel: null
                  };

                  var collectionMap = {
                        subTestName: null,
                        subTestSubjectArea: null,
                        RITScore: null,
                        PercentileRank: null,
                        MetTypicalGrowth_LastFall2ThisFall: null,
                        MetTypicalGrowth_LastSpring2ThisSpring: null,
                        MetTypicalGrowth_LastFall2ThisSpring: null,
                        schoolName: null,
                        studentGradeLevel: null
                  };

                  collectionScoreSets.schoolYear = gradeLevelAndSchoolYears[assessment.studentGradeLevel] || me.notAvailable;
                  collectionScoreSets.localId   = l.get(assessment, 'school.localId', me.notAvailable);
                  collectionScoreSets.schoolName = l.get(assessment, 'school.schoolName', me.notAvailable);
                  collectionScoreSets.studentGradeLevel      = l.get(assessment, 'studentGradeLevel', me.notAvailable);

                  if(l.has(assessment, 'scoreSets.scoreSet')){

                        if(!_.isArray(assessment.scoreSets.scoreSet)){

                              assessment.scoreSets.scoreSet = [assessment.scoreSets.scoreSet];

                        }

                        assessment.scoreSets.scoreSet.forEach(function(scoreSet){

                              var attemptCode = l.get(scoreSet, 'attemptCode');

                              var newCollection = null;
                              /**
                               * Check if its MAP or STATE
                               */
                              if(attemptCode){
                                    /**
                                     * STATE HERE
                                     */
                                    newCollection = l.assign(collectionState, {
                                        subTestSubjectArea: l.get(scoreSet, 'raw:source.raw:subTestSubjectArea'),
                                        subTestName: l.get(scoreSet, 'subTestName'),
                                        attemptCode: attemptCode,
                                        attemptCodeDescription: l.has(me.config.xAssessmentAttemptCodeType, attemptCode) ?
                                                me.config.xAssessmentAttemptCodeType[attemptCode].description : null,
                                        schoolName: collectionScoreSets.schoolName,
                                        studentGradeLevel: collectionScoreSets.studentGradeLevel
                                    });

                                    if(l.has(scoreSet, 'scores.score')){

                                          if(_.isObject(scoreSet.scores.score)) {
                                                scoreSet.scores.score = [ scoreSet.scores.score ];
                                          }

                                          scoreSet.scores.score.forEach(function(score){

                                                score.forEach(function(sc) {

                                                      switch(sc.metric){
                                                            case '03479':
                                                                  newCollection.Score = sc.scoreValue;
                                                                  break;
                                                            case '00503':
                                                                  newCollection.LevelCode = sc.scoreValue;
                                                                  break;
                                                            case '00500':
                                                                  newCollection.MetStandard = sc.scoreValue;
                                                                  break;
                                                      }

                                                });

                                          });

                                    }

                                    collectionScoreSets.states.push(me._replaceAssessmentDescriptionCollection(newCollection, scoreSet));

                              } else{
                                    /**
                                     * Map Here
                                     */
                                    newCollection = l.assign(collectionMap, {
                                        subTestSubjectArea: l.get(scoreSet, 'raw:source.raw:subTestSubjectArea'),
                                        subTestName: l.get(scoreSet, 'subTestName'),
                                        schoolName: collectionScoreSets.schoolName,
                                        studentGradeLevel: collectionScoreSets.studentGradeLevel
                                    });

                                    if(l.has(scoreSet, 'scores.score')){

                                          if(_.isObject(scoreSet.scores.score)) {
                                                scoreSet.scores.score = [ scoreSet.scores.score ];
                                          }

                                          scoreSet.scores.score.forEach(function(score){

                                                score.forEach(function(sc) {

                                                      switch(sc.metric){
                                                            case '00506':
                                                                  newCollection.RITScore = sc.scoreValue;
                                                                  break;
                                                            case '00502':
                                                                  newCollection.PercentileRank = sc.scoreValue;
                                                                  break;
                                                            case '03474':

                                                                  var scoreValues = String(sc.scoreValue).trim().split(' ');

                                                                  if(scoreValues.length === 2 && l.has(newCollection, scoreValues[0]) && !_.isEmpty(scoreValues[1])){

                                                                        newCollection[scoreValues[0]] = scoreValues[1].toLowerCase() === 'true' ? 'Yes' : 'No';

                                                                  }

                                                                  break;
                                                      }

                                                });

                                          });

                                    }

                                    collectionScoreSets.maps.push(me._replaceAssessmentDescriptionCollection(newCollection, scoreSet));

                              }

                        });

                  }

                  me.collections.push(collectionScoreSets);

            });

      }

};
/**
 *
 * @param newCollection
 * @param scoreSet
 * @returns {*}
 * @private
 */
Assessment.prototype._replaceAssessmentDescriptionCollection = function(newCollection, scoreSet){
      if(newCollection.subTestSubjectArea){
            newCollection.subTestSubjectArea = l.get(scoreSet, 'raw:source.raw:subTestSubjectArea');
      }

      return newCollection;
};
/**
 *
 * @param code
 */
Assessment.prototype.getMetricMap = function(code){

      var metricMap = this.config.xSubtestScoreMetricType;

      code = parseInt(code);

      code = String(code);

      return l.get(metricMap, code, null);

};



module.exports = Assessment;