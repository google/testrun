""" Module to create pie chart for coverage with 
TO DO and DONE percentages 
"""

import os
import matplotlib.pyplot as plt

def plot_test_coverage(rows, chart_filename, title, results_dir):
  """ Plot the test coverage as a pie chart for 'Done' and 'To Do' """

  # Sum up all 'Done' percentages
  total_done = sum(float(row["DONE (%)"]) for row in rows)

  # Total number of endpoints
  total_count = len(rows)

  # Average 'Done' percentage
  average_done = total_done / total_count if total_count > 0 else 0

  # Calculate 'To Do' as the remainder to 100%
  average_to_do = 100 - average_done

  # Data to plot
  labels = "Done", "To Do"
  sizes = [average_done, average_to_do]
  colors = ["#c2f1c8", "#ff6d70"]
  explode = (0.1, 0)

  # Plot
  plt.figure(figsize=(8, 6))
  plt.pie(sizes, explode=explode, labels=labels, colors=colors,
          autopct="%1.1f%%", shadow=True, startangle=140)

  # Equal aspect ratio to ensure that the pie is drawn as a circle
  plt.axis("equal")
  plt.title(title)

  # Save the chart as a PNG file
  plt.savefig(os.path.join(results_dir, chart_filename))
  print(f"{chart_filename} exported to {results_dir}/{chart_filename}")
