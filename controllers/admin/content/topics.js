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

/**
 * Parent topics controller
 */

function Topics(){}

//inheritance
util.inherits(Topics, pb.BaseController);

Topics.prototype.render = function(cb) {
	self.redirect('/admin/content/topics/manage_topics', cb);
};

Topics.getPillNavOptions = function(activePill) {
    return [
        {
            name: 'import_topics',
            title: '',
            icon: 'upload',
            href: '/admin/content/topics/import_topics'
        },
        {
            name: 'new_topic',
            title: '',
            icon: 'plus',
            href: '/admin/content/topics/new_topic'
        }

    ];
};

//exports
module.exports = Topics;
