---
layout: post
title: "Chicago Summer Violence Analysis"
date: 2024-05-31
author: Kevin Magnan
categories: [Data Analysis, Chicago, Violence]
description: "Analysis of Chicago summer violence patterns"
thumbnail: /assets/images/blog/2024-05-31-Chicago-Summer-Violence-Analysis/thumbnail.png
---

Chicago Summer Violence Analysis



Tableau

data visualization

GenAI

GIS

interactive

inspiration



A detailed overview of my Chicago Summer Violence Dashboard, highlighting its key features, data sources, and practical applications for enhancing public safety in Chicago.

Estimated Read Time: 6 minutes



[  Kevin Magnan https://twitter.com/KevinMagnan ](  Kevin Magnan https://twitter.com/KevinMagnan )  

05-31-2024



Contents



Introduction

Hexagon Grids for Spatial Analysis

Chicago Violence Reduction Dashboard Data

Chicago Summer Violence Tableau Dashboard

Conclusion

Acknowledgments



Introduction

In today's justice and public safety landscape, data-driven decision-making is essential for addressing complex challenges. Recently, I was inspired by the University of Chicago Crime Lab's Chicago Summer Violence analysis and interactive map, which showcases an innovative approach to public safety issues. Motivated by their work and leveraging data from the City of Chicago Violence Reduction Dashboard, I created my own version of the dashboard with some improvements and customizations I have found in my career to be instrumental in conveying critical and timely public safety data to practitioners. I'm excited to introduce my Chicago Summer Violence Dashboard, highlighting its features, data sources, and its potential impact on violence reduction strategies.

What caught my attention with the Crime Lab's Summer Violence map was their use of a raster grid analysis overlaid on top of Chicago, a practical method to group points across a large city like Chicago. This method is particularly effective due to the political and socioeconomic nature of traditional, antiquated geographies in the United States. Police boundaries, neighborhoods, and even political districts rarely change, and often do not change through a rigorous data-driven process. Therefore, uniform raster grids provide a structured, yet effective GIS mapping technique.

That being said, the particular 45-degree shifted square grid used by Crime Lab left me wanting more. Instead of a traditional square raster grid application, I made use of hexagons to capture both the staggering of latitude and longitude points from the Chicago Data Portal (done to 'randomize' exact locations of shootings) and eliminate the sharp edges and potential abnormalities from the 45-degree angled square used by the Crime Lab, which may not properly conform to street segments in Chicago.

Hexagon Grids for Spatial Analysis

In creating my Chicago Summer Violence Dashboard, I relied heavily on a fantastic tutorial by Sarah Battersby (twitter) detailed in a blog post on the Tableau Community site, titled How to Create Hexagonal Grids for Spatial Aggregation in Tableau This tutorial provided a clear and comprehensive guide on generating hexagonal grids using QGIS, which I then integrated into Tableau for spatial analysis.

The only change I made from Sarah's tutorial was the sizing of the hexagon grid to better reflect the City of Chicago and arrange better within Chicago Community Areas and CPD Districts.



![Example of hexagon gid](/assets/images/blog/2024-05-31-Chicago-Summer-Violence-Analysis/hexgrid.png)

Example of hexagon gid



Important note for introducing the hexagon grids into Tableau is to make use of the grid ID. Spatial Joins in Tableau, while possible, can significantly degrade dashboard performance. As a result, I built the hexagon grids and performed spatial joins for both the City of Chicago Shooting data and ShotSpotter data in QGIS.

Chicago Violence Reduction Dashboard Data



![Chicago Violence Reduction Dashboard Data Portal](/assets/images/blog/2024-05-31-Chicago-Summer-Violence-Analysis/vrd_data.png)

Chicago Violence Reduction Dashboard Data Portal



The Chicago Data Portal offers a variety of data sources from city organizations, including public safety and the Chicago Police Department (CPD). For this analysis, I utilized the Victims of Homicides and Non-Fatal Shootings and ShotSpotter Alerts datasets. While the Crime Lab's analysis took a different approach by incorporating robbery data from the city's larger crime dataset, I believe a more focused approach on weapon-related or firearm-related incidents would have been beneficial for their analysis.

That being said,I placed greater emphasis on ShotSpotter data, not only due to the recent discussions about its future in Chicago but also because of my prior experience working with this data. ShotSpotter has proven effective in identifying areas with high levels of gunfire, regardless of whether injuries occurred or 9-1-1 calls were made. This makes it a valuable resource for pinpointing locations that require immediate attention and intervention.

Chicago Summer Violence Tableau Dashboard

In Tableau Public Desktop, I loaded the hexagon GeoJSON file and created inner joins with three boundary layers: Community Areas, Police Beats, and Police Districts. These joins were based on the hexagon grid ID, which I already spatially joined in QGIS to avoid less efficient spatial joins within Tableau. After setting up the boundaries, I established relationships on the hexagon grid ID between the boundaries and the two datasets from the Chicago Data Portal.



![GIS Boundary Joins](/assets/images/blog/2024-05-31-Chicago-Summer-Violence-Analysis/boundaries.png)

GIS Boundary Joins



![Data Relationships](/assets/images/blog/2024-05-31-Chicago-Summer-Violence-Analysis/relationships.png)

Data Relationships



Once the data was loaded, the next step was building the dashboard. While I won't delve into the dashboard design details here (potentially saving that for another post), the unique aspect of this analysis was working with the hexagon grids and mapping layers in Tableau. Visualizing the grids works similarly to visualizing any mapping layer through the geometry and generated latitude and longitude of the polygons. The hexagon unique ID is crucial for Tableau to identify each unique grid and associate shootings and ShotSpotter alerts with those grids, enabling the creation of choropleths and accurate counts.

Parameters are invaluable for allowing users to enable or disable each layer within the dashboard. For example, when a user selects the Police Districts map layer, a Tableau parameter combined with a calculated field isolates this selection, preventing the geometry data of other layers from being visualized.



![Tableau Map Layers](/assets/images/blog/2024-05-31-Chicago-Summer-Violence-Analysis/map_layers.png)

Tableau Map Layers



I also leveraged Tableau's dynamic visibility feature to swap the temporal visualizations between Shooting and ShotSpotter data based on the dashboard parameter. This allows users to seamlessly switch between different datasets without cluttering the interface. By using dynamic visibility, I was able to maintain a clean and user-friendly dashboard that adapts to the viewer's needs, making it easier to compare and analyze different types of data or data from separate data sources.

The final technical complexity involved determining the top x% of hexagon grids across Chicago for shootings and ShotSpotter alerts. I'll keep this brief, but the calculated fields can be found in my Tableau Public Dashboard. In summary, for both shootings and ShotSpotter alerts, I calculated the counts for each grid and uniquely ranked them. Simultaneously, I allowed users to input any percentage of top hexagon grids to retain, offering a variation from Crime Lab's fixed 5% or 10% selection. I then calculated the number of grids this user selection represented. Finally, I created a calculation for Tableau to retain only the number of ranked grids corresponding to the user selection. Thus, if a user selected a top percentage that resulted in 500 grids, Tableau would only visualize the top 500 grids ranked for either shootings or ShotSpotter alerts.

You can find the dashboard on my Tableau Public page or embedded below:



![Chicago Summer Violence ](/assets/images/blog/2024-05-31-Chicago-Summer-Violence-Analysis/1_rss.png)



   



Conclusion

Building the Chicago Summer Violence Dashboard was both a challenging and rewarding experience. By using hexagon grids and Tableau's advanced mapping and dynamic visibility features, I aimed to create a tool that provides clear and actionable insights into violence trends across the city.

I hope you find this dashboard useful and easy to navigate. Feel free to explore the data, customize the views, and share your insights. Your feedback is always welcome as I continue to refine and improve this tool.

Acknowledgments

This blog post was structured and written with the assistance of OpenAI's ChatGPT through one of my customGPT's. These tools helped streamline the writing process, making it more clear and concise for all audiences. I also leveraged the new GPT 4-o model in dashboard design, accessibility, and analysis. Utilizing advanced AI technologies allowed me to focus more on the insights and technical aspects of the dashboard creation, ensuring that the information presented is accessible and engaging for readers.