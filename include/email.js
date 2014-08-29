/*
    Copyright (C) 2014  PencilBlue, LLC

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

//dependencies
NodeMailer = require('nodemailer');

/**
 * Service for sending emails.
 *
 * @module Services
 * @class EmailService
 * @constructor
 */
function EmailService(){}


/**
 * Retrieves a template and sends it as an email
 *
 * @method sendFromTemplate
 * @param {Object}   options Object containing the email settings and template name
 * @param {Function} cb      Callback function
 */
EmailService.prototype.sendFromTemplate = function(options, cb){
	var self = this;
	var ts   = new pb.TemplateService();
	if (options.replacements) {
		for(key in options.replacements) {
			ts.registerLocal(key, options.replacements[key]);
		}
	}
	ts.load(options.template, function(err, data) {

		var body = '' + data;
		self.send(options.from, options.to, options.subject, body, cb);
	});
};

/**
 * Sends an email
 *
 * @method send
 * @param  {String}   from    From name
 * @param  {String}   to      To email address
 * @param  {String}   subject Email subject
 * @param  {String}   body    Email content
 * @param  {Function} cb      Callback function
 */
EmailService.prototype.send = function(from, to, subject, body, cb) {

	this.getSettings(function(err, emailSettings) {
        if (util.isError(err)) {
            throw err;
        }
        else if (!emailSettings) {
            throw new Error('No Email settings available.  Go to the admin settings and put in SMTP settings');
        }

        var options = {
            service: emailSettings.service,
            auth:
            {
                user: emailSettings.username,
                pass: emailSettings.password
            }
        };
        if (emailSettings.service == 'custom') {
        	options.host = emailSettings.host,
        	options.secureConnection = emailSettings.secure_connection,
        	options.port = emailSettings.port;
        }
        var smtpTransport = NodeMailer.createTransport("SMTP", options);

        var mailOptions =
        {
            from: from || (emailSettings.from_name + '<' + emailSettings.from_address + '>'),
            to: to,
            subject: subject,
            html: body
        };

        smtpTransport.sendMail(mailOptions, function(err, response) {
            if (util.isError(err)) {
            	pb.log.error("EmailService: Failed to send email: ", err);
            }
            smtpTransport.close();

            cb(err, response);
        });
    });
};

/**
 * Retrieves the email settings
 *
 * @method getSettings
 * @param {Function} cb Callback function
 */
EmailService.prototype.getSettings = function(cb) {
	var self = this;
	pb.settings.get('email_settings', function(err, settings) {
        cb(err, util.isError(err) ? self.getDefaultSettings() : settings);
    });
};

/**
 * Retrieves the default email settings from installation
 *
 * @method getDefaultSettings
 * @return {Object} Email settings
 */
EmailService.prototype.getDeafultSettings = function() {
	return {
        from_name: 'pencilblue',
        from_address: 'no-reply@pencilblue.org',
        verification_subject: 'pencilblue Account Confirmation',
        service: 'Gmail',
        host: '',
        secure_connection: 1,
        port: 465,
        username: '',
        password: ''
    };
};

//exports
module.exports.EmailService = EmailService;
