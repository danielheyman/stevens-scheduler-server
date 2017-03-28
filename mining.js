module.exports = function(term) {
    var findingNewSession = {};

    function newSession(session, subject, cb) {
        if(findingNewSession[subject]) {
            var waitForSession = function() {
                if(findingNewSession[subject]) setTimeout(waitForSession, 50);
                else cb();
            };
            return waitForSession();
        }
        console.log('Creating new session for ' + subject);

        findingNewSession[subject] = true;

        var options = {
            url: 'https://es.stevens.edu/ia-bin/tsrvweb.exe?&WID=W&tserve_tip_write=||WID&ConfigName=rcrssecthp1&ReqNum=1&TransactionSource=H&tserve_trans_config=rcrssecthp1.cfg&tserve_host_code=[HostZero]&tserve_tiphost_code=[TipZero]',
            ciphers: 'DES-CBC3-SHA',
        };
        
        if(session) options.jar = session;
        
        request(options, function(error, response, body) {
            if (error) {
                newSession(session, subject, cb);
                return console.log(error);
            }
            cb();
            findingNewSession[subject] = false;
        });
    }

    function sessionOver(body) {
        return (body.indexOf('errortext') > -1);
    }

    newSession(null, "null", function() {
        var options = {
            url: 'https://es.stevens.edu/ia-bin/tsrvweb.exe',
            method: 'POST',
            ciphers: 'DES-CBC3-SHA',
            form: {
                tserve_tip_read_destroy: '',
                tserve_host_code: '[HostZero]',
                tserve_tiphost_code: '[TipZero]',
                tserve_trans_config: 'rcrssecthp3.cfg',
                TransactionSource: 'H',
                tserve_tip_write: '||WID|SID|PIN|Term|Subject|CourseID|AppTerm|ConfigName',
                ReqNum: '1',
                Term: term
            }
        };
        
        request(options, function(error, response, body) {
            if (error) return console.log(error);
            
            var $ = cheerio.load(body);
            $('.optdefault option').each(function(i, elem) {
                findSubject($(this).val(), request.jar());
            });
        });
        //findClasses('PE  -200');
    });

    function findSubject(subject, session) {
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
                tserve_tip_write: '||WID|SID|PIN|Term|Subject|CourseID|AppTerm|ConfigName',
                ReqNum: '2',
                Subject: subject,
                Term: term
            }
        };
        
        request(options, function(error, response, body) {
            if (error) {
                setTimeout(function() { findSubject(subject); }, 1000);
                return console.log(error);
            }
            if(sessionOver(body)) return newSession(session, subject, function() { findSubject(subject, session); });
            
            var $ = cheerio.load(body);
            $('.optdefault option').each(function(i, elem) {
                findClasses($(this).val(), subject, session);
                total++;
                console.log("Finding course: " + $(this).val());
            });
        });
    }

    var count = 1;
    var total = 0;

    function findClasses(course, subject, session) {
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
                setTimeout(function() { findClasses(course, subject, session); }, 1000);
                return console.log(error);
            }
            if(sessionOver(body)) return newSession(session, subject, function() { findClasses(course, subject, session); });
            
            var $ = cheerio.load(body);
            $('.datadisplaytable tr:not(:first-child)').each(function(i, elem) {
                if($(this).find('td[headers=CourseID]').length === 0) return;
                var res = {
                    term: term,
                    section: $(this).find('td[headers=CourseID]').text().split('\r\n')[0].clean().replace(/[^0-9a-z ]/gi, ''),
                    title: $(this).find('td[headers=CourseID]').text().split('\r\n')[1].clean(),
                    callNumber: $(this).find('td[headers=CallNumber]').text().clean(),
                    credits: parseFloat($(this).find('td[headers=Credits]').text().clean()),
                    currentEnrollment: 0,
                    maxEnrollment: 0,
                    open: false,
                    activity: $(this).find('td[headers=Activity]').text().clean(),
                    daysTimeLocation: [$(this).find('td[headers=DaysTimeLocation]').html().clean()],
                    instructor: $(this).find('td[headers=Instructor]').text().clean(),
                    startDate: new Date($(this).find('td[headers=Session]').html().split("<br>")[1].clean().split(" ")[0]),
                    endDate: new Date($(this).find('td[headers=Session]').html().split("<br>")[1].clean().split(" ")[2])
                };
                
                if((match = $(this).find('td[headers=StatusAndSeats]').text().clean()).indexOf("Open") > -1) {
                    res.open = true;
                    if(match.indexOf('of') > -1) {
                        Object.assign(res, {
                            currentEnrollment: parseInt(match.split(' ')[2]),
                            maxEnrollment: parseInt(match.split(' ')[4]),
                            open: true,
                        });
                    }
                }
                
                var next = $(this);
                while((next = next.next()).find('td:first-child').attr('class') == 'dddefault') {
                    if(next.find('td').length === 1) {
                        res.other = next.find('td').html().split('<br>').map((x) => x.clean());
                    } else {
                        res.daysTimeLocation.push(next.find('td[headers=DaysTimeLocation]').html().clean());
                    }
                }
                
                res.daysTimeLocation = res.daysTimeLocation.map(function(day) {
                    
                    if((match = day.match(/(\d+:\d+-?)+[A|P]M/))) {
                        dayres = {
                            days: day.match(/[M|T|W|R|F]+/)[0],
                            start: match[0].split('-')[0],
                            end: match[0].split('-')[1],
                            loc: day.split("<br>")[2] !== '' ? day.split("<br>")[2] : 'N/A'
                        };
                        if(dayres.end.slice(-2) == 'AM' ||  ['09', '10', '11'].indexOf(dayres.start.slice(0,2)) > -1) {
                            dayres.start += 'AM';
                        }
                        else {
                            dayres.start += 'PM';
                        }
                    } else {
                        dayres = {
                            loc: day.split("<br>")[2] !== '' ? day.split("<br>")[2] : 'N/A'
                        };
                    }
                    return dayres;
                });
                
                Course.update({term: term, callNumber: res.callNumber}, res, {upsert: true}, function (err) {
                    if(err) return;
                });
            });
            
            console.log('Found ' + count++ + ' of ' + total + ': ' + course);
        });
    }
};
