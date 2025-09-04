const cron = require("node-cron");
const Flight = require("../models/flightModel");
const Notifications = require("../models/notificationModel");

// Helper: Parse "25 Mar 2025" → Date object
function parseDepartureDate(dateStr) {
  return new Date(Date.parse(dateStr)); // JavaScript can parse "25 Mar 2025"
}

cron.schedule("2 18 * * *", async () => {
  try {
    const today = new Date();
    const twoDaysLater = new Date();
    twoDaysLater.setDate(today.getDate() + 2);

    const startOfDay = new Date(twoDaysLater.setHours(0, 0, 0, 0));
    const endOfDay = new Date(twoDaysLater.setHours(23, 59, 59, 999));

    // Get all flights
    const flights = await Flight.find();

    for (const flight of flights) {
      if (!flight.departureDate) continue;

      const depDate = parseDepartureDate(flight.departureDate);

      // Check if departure date is 2 days from now
      if (depDate >= startOfDay && depDate <= endOfDay) {
        await Notifications.create({
          flightId: flight._id,
          type: "Flight Status",
          content: `Reminder: Flight ${flight.inventoryId} will depart on ${flight.departureDate} (in 2 days).`,
          sendTo: "all",
        });
      }
    }

    console.log(`[Cron] Flight departure reminders generated.`);
  } catch (err) {
    console.error("Error generating flight reminders:", err);
  }
});
