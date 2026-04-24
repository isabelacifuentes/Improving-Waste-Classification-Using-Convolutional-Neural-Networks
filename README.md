# Improving-Waste-Classification-Using-Convolutional-Neural-Networks
This project investigates the problem of incorrectly classifying waste as recyclable or non-recyclable in the context of Artificial Intelligence. Existing approaches to this problem often face challenges such as human error, inconsistency, and difficulty identifying materials from appearance alone. In this project, I use CNN as a AI-based solution.

# Improving Waste Classification Using CNNs

Final project app for Isabela Cifuentes, CAP4630 Final Project.

## What the app does

This browser app demonstrates a waste-classification workflow:

1. Upload or drag in an image of a waste item.
2. The app previews the image and performs preprocessing-style analysis.
3. It predicts whether the item is recyclable or non-recyclable.
4. It displays confidence, detected material, and the workflow used by the project.

The current version is a self-contained demo that runs without a server-side dependency. It uses local image features to simulate the inference flow and is structured so a trained CNN model can replace the demo classifier later.

## How to run

Open `index.html` directly in a browser, or run:

```bash
python3 -m http.server 5173
```

Then visit:

```text
http://localhost:5173
```

## Connecting a trained CNN

To connect a real model, export the trained CNN from Keras/TensorFlow to TensorFlow.js format, add the model files to a `model/` folder, and replace the `classifyFeatures` call in `app.js` with model loading and prediction logic.

Suggested production classes:

- Recyclable: paper, cardboard, glass, metal, plastic
- Non-recyclable: trash, food waste, contaminated items

## Project note

The app is designed as a decision-support prototype. Recycling rules vary by city and contamination level, so final recommendations should be validated against local waste-management guidelines.
 
