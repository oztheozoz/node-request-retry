'use strict';

var request = require('../');
var t = require('chai').assert;
var sinon = require('sinon');

describe('Request attempts', function () {
  it('should show 1 attempt after a successful call', function (done) {
    request.get('http://www.filltext.com/?rows=1', function (err, response, body) {
      t.strictEqual(response.statusCode, 200);
      t.strictEqual(response.attempts, 1);
      done();
    });
  });

  it('should show 3 attempts after some retries', function (done) {
    request({
      url: 'http://www.filltext.com/?rows=1&err=500', // return a 500 status
      maxAttempts: 3,
      retryDelay: 100
    }, function (err, response, body) {
      t.strictEqual(response.statusCode, 500);
      t.strictEqual(response.attempts, 3);
      done();
    });
  });

  it('should call delay strategy 2 times after some retries', function () {
    var delayRequest = function(delayTime) {
      var mockDelayStrategy = sinon.stub().returns(delayTime);
      var startTime = process.hrtime();
      return new Promise(function (resolve,reject) {
        request({
          url: 'http://www.filltext.com/?rows=1&err=500', // return a 500 status
          maxAttempts: 3,
          retryDelay: 1000000, // Set to large delay to prove it will not be used
          delayStrategy: mockDelayStrategy
        }, function (err, response, body) {
          if (err) {
            reject(new Error('error making request'));
          } else {
            var endTime = process.hrtime(startTime); // process.hrtime returns an array [seconds, nanoseconds]
            var timeDiff = endTime[0] * 1000 + endTime[1]/1000000;
            t.isTrue(mockDelayStrategy.calledTwice, 'mockDelayStrategy was called an incorrect amount of times'); // reason it's called 2 and not 3 times is because there is no delay for the first call
            resolve(timeDiff);
          }
        });
      });
    };

    var timeDiffFirstRequest = 0;
    return delayRequest(1).then(function(timeDiff) {
      timeDiffFirstRequest = timeDiff;
      return delayRequest(100);
    }).then(function(timeDiff) {
      var timeDiffSecondRequest = timeDiff;
      var totalDelayTime = timeDiffSecondRequest - timeDiffFirstRequest;
      t.isTrue(totalDelayTime >= 150 && totalDelayTime <= 300, 'delayStrategy\'s delay time expected to be between 200 and 300 ms inclusive but was ' + totalDelayTime + 'ms');
    });
  });
});

