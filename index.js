'use strict';

const aws = require('aws-sdk');
const promise = require('bluebird');
const mailgun = require('mailgun.js');

const ssm = promise.promisifyAll(new aws.SSM({ region: 'us-west-2' }));
const s3 = new aws.S3({ apiVersion: '2006-03-01' });

exports.handler = (event, context, callback) => {

    //('Received event:', JSON.stringify(event, null, 2));

    let options = {
        Names: [
            'litwicki.mail.mailgun_api_key',
            'litwicki.mail.mailgun_public_key'
        ],
        WithDecryption: true
    };

    ssm.getParameters(options, function (err, data) {
        if (err) {
            console.log(err, err.stack);
        } else {

            let params = {};

            data.Parameters.forEach(function (param) {
                params[param.Name] = param.Value;
            });

            var mailer = mailgun.client({username: 'api', key: params['litwicki.mail.mailgun_api_key']});

            // Get the object from the event and show its content type
            const bucket = event.Records[0].s3.bucket.name;
            const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

            var url = "http://" + bucket + ".s3.amazonaws.com/" + key;

            s3.getObject({
                Bucket: bucket,
                Key: key,
            }, (err, data) => {
                if (err) {
                    //console.log(err);
                    const message = "Error getting object " + key + " from bucket " + bucket + ". Make sure they exist and your bucket is in the same region as this function.";
                    console.log(message);
                    callback(message);
                } else {
                    mailer.messages.create('litwicki.com', {
                        from: "litwicki <dev@litwicki.com>",
                        to: ["dev@litwicki.com"],
                        subject: "New litwicki Build: " + key,
                        text: "A new litwicki build is complete: " + url,
                        html: "<h1>New litwicki Build</h1><p>A new litwicki build is complete: " + url + "</p>"
                    })
                    .then(msg => console.log(msg)) // logs response data
                    .catch(err => console.log(err)); // logs any error 
                }
            });
        }
    });

};