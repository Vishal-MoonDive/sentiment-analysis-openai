import axios from "axios";

const GOOGLE_PLACES_API_KEY = "AIzaSyAeaI1gkovXnm4yY1AzN97XOmcf1db5aAo";

// Define public place types
const PUBLIC_PLACE_TYPES = ["park", "museum", "library", "point_of_interest", "establishment"];

export default async function handler(req, res) {
    const { locationName } = req.query;

    if (!locationName) {
        return res.status(400).json({ error: "Location name is required." });
    }

    try {
        // Call Google Places Text Search API
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
            locationName
        )}&key=${GOOGLE_PLACES_API_KEY}`;

        const response = await axios.get(url);
        const places = response.data.results;

        if (places.length === 0) {
            return res.status(404).json({ isPublic: false, message: "No such location found." });
        }

        // Check if any place matches public types
        const isPublic = places.some((place) =>
            place.types.some((type) => PUBLIC_PLACE_TYPES.includes(type))
        );

        return res.status(200).json({ isPublic });
    } catch (error) {
        console.error("Error fetching data from Google Places API:", error.message);
        return res.status(500).json({ error: "Failed to fetch data from Google Places API." });
    }
}
