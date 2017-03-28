var Schema = mongoose.Schema;

var Course = new Schema({
    term: String,
    section: String,
    title: String,
    callNumber: String,
    credits: Number,
    currentEnrollment: Number,
    maxEnrollment: Number,
    open: Boolean,
    activity: String,
    daysTimeLocation: [{ 
        days: String, 
        start: String, 
        end: String, 
        loc: String
    }],
    instructor: String,
    startDate: Date,
    endDate: Date,
    other: [String]
}, { collection : 'Courses', timestamps: { updatedAt: 'updated_at', createdAt: 'created_at' } });

Course.index({ term: 1, callNumber: 1 }, { unique: true });

module.exports = mongoose.model('Course', Course);
