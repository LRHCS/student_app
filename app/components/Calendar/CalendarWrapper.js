"use client"
import Calendar from './CalendarClient'

export default function CalendarWrapper({ calendarData }) {
  return <Calendar 
    exam={calendarData.exams} 
    assignments={calendarData.assignments}
    courses={calendarData.courses}
    topics={calendarData.topics}
  />
} 