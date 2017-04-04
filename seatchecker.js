module.exports = function(term) {
    function newSession(session, subject, cb) {
        console.log('Creating new session for ' + subject);

        var options = {
            url: 'https://es.stevens.edu/ia-bin/tsrvweb.exe?&WID=W&tserve_tip_write=||WID&ConfigName=rcrssecthp1&ReqNum=1&TransactionSource=H&tserve_trans_config=rcrssecthp1.cfg&tserve_host_code=[HostZero]&tserve_tiphost_code=[TipZero]',
            ciphers: 'DES-CBC3-SHA',
        };
        
        if(session) options.jar = session;
        
        request(options, function(error, response, body) {
            if (error) {
                newSession(session, subject, cb, true);
                return console.log(error);
            }
            cb();
        });
    }

    function sessionOver(body) {
        return (body.indexOf('errortext') > -1);
    }
    
    function findClasses(classes, cb) {
        newSession(function(session) {
            async.map(classes, function(c, cb) {
                findClass(course, subject, c, session, cb);
            }, function(res) {
                cb(res);
            });       
        });
    }
    
    function findClass(course, subject, section, session, cb) {
        var options = {
            url: 'https://es.stevens.edu/ia-bin/tsrvweb.exe',
            method: 'POST',
            ciphers: 'DES-CBC3-SHA',
            jar: session,
            form: {
                tserve_tip_read_destroy: '',
                tserve_host_code: '[HostZero]',
                tserve_tiphost_code: '[TipZero]',
                tserve_trans_config: 'rcrssecthp3.cfg',
                TransactionSource: 'H',
                CourseID: course,
                tserve_tip_write: '||WID|SID|PIN|Term|Subject|CourseID|AppTerm|ConfigName',
                ReqNum: '3',
                Term: term
            }
        };
        
        String.prototype.clean = function() {
            return this.trim().replace(/ +(?= )/g,'').replace(/&#xA0;/g, '');
        };

        request(options, function(error, response, body) {
            if (error) {
                setTimeout(function() { findClass(course, subject, section, session, cb); }, 1000);
                return console.log(error);
            }
            if(sessionOver(body)) return newSession(session, subject, function() { findClass(course, subject, section, session, cb); });
            
            var $ = cheerio.load(body);
            $('.datadisplaytable tr:not(:first-child)').each(function(i, elem) {
                if($(this).find('td[headers=CourseID]').length === 0) return;
                if(section != $(this).find('td[headers=CourseID]').text().split('\r\n')[0].clean().replace(/[^0-9a-z ]/gi, '')) return;
                
                if((match = $(this).find('td[headers=StatusAndSeats]').text().clean()).indexOf("Open") > -1) {
                    if(match.indexOf('of') > -1) {
                        return cb(Math.max(0, parseInt(match.split(' ')[4]) - parseInt(match.split(' ')[2])));
                    }
                }
                return cb(0);
            });
        });
    }
};
