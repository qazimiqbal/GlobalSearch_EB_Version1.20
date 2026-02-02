// ParcelInfo.js
import React, { useEffect, useState } from 'react';

const PropertyInfo = ({ parcelID }) => {
    const currentYear = new Date().getFullYear(); // Get current year
    const [selectedYear, setSelectedYear] = useState(currentYear); // Selected year for query
    const [historicData, setHistoricData] = useState(null);
    const [profileData, setProfileData] = useState(null);
    const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistoricData = async () => {
        const queryUrl = `https://gismaps.fultoncountyga.gov/arcgispub/rest/services/Temp/GlobalSearch_Dialog/MapServer/2/query?f=json&where=ParcelID='${parcelID}' AND TaxYear=${selectedYear}&outFields=*`;
        try {
        const response = await fetch(queryUrl);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const Historicdata = await response.json();
        // Check if any features are returned
        if (Historicdata.features && Historicdata.features.length > 0) {
          setHistoricData(Historicdata.features[0].attributes); // Assuming you want the attributes of the first feature
        } else {
          setError('No data found for the given Parcel ID.');
        }
      } catch (error) {
        setError(error.message);
      }
    };

        // New logic for fetching zoning data
    const fetchPropertyProfileData = async () => {
      const zoningUrl = `https://gismaps.fultoncountyga.gov/arcgispub/rest/services/Temp/GlobalSearch_Dialog/MapServer/3/query?f=json&where=ParcelID='${parcelID}'&outFields=*`;
      try {
        const response = await fetch(zoningUrl);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const PropertyProfiledata = await response.json();
        // Check if any features are returned
        if (PropertyProfiledata.features && PropertyProfiledata.features.length > 0) {
          setProfileData(PropertyProfiledata.features[0].attributes); // Assuming zoningClass is in the attributes
          // Calculate and set rounded XMin
          
        } else {
          setProfileData('No Profile data found.');
        }
      } catch (error) {
        setError(error.message);
      }
    };

    if (parcelID) { 
      fetchHistoricData();
      fetchPropertyProfileData(); // Call the new function here
      
    };

  }, [parcelID, selectedYear]);

  const handleYearChange = (event) => {
    console.log(event.target.value);
    setSelectedYear(parseInt(event.target.value)); // Update state with selected year
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!historicData || !profileData) {    
    return <div>Loading...</div>;
  }

  const roundedXMin = profileData && profileData.XMin ? Math.round(parseFloat(profileData.XMin))-100 : 0;
  const roundedYMin = profileData && profileData.YMin ? Math.round(parseFloat(profileData.YMin))-100 : 0;
  const roundedXMax = profileData && profileData.XMax ? Math.round(parseFloat(profileData.XMax))+100 : 0;
  const roundedYMax = profileData && profileData.YMax ? Math.round(parseFloat(profileData.YMax))+100 : 0;

  
  const parcelUrl = `https://gismaps.fultoncountyga.gov/arcgispub2/rest/services/Basemap/FultonStreetBaseMap/MapServer/export?bbox=${roundedXMin},${roundedYMin},${roundedXMax},${roundedYMax}&bboxSR=&layers=&layerdefs=&size=480,400&imageSR=&format=png24&transparent=false&dpi=&f=image`;
  
  const taxUrl = `https://qpublic.schneidercorp.com/Application.aspx?AppID=936&LayerID=18251&PageTypeID=4&PageID=8156&Q=2124870374&KeyValue=${historicData.ParcelID}`;

  console.log("Parcel url = ",parcelUrl);

return (
    <div class="container">
      <div class="column">
        <div class="box">
          <div class="header">Property Tax Information</div>
          <div class="content">
          <table>
            <tr bgcolor='gray'>
                <td class="text-left">Tax Year:</td><td class="text-rightcell">
                <select value={selectedYear} onChange={handleYearChange}>
                  <option value={2024}>2024</option>
                  <option value={2023}>2023</option>
                  <option value={2021}>2021</option>
                  <option value={2020}>2020</option>
                  <option value={2019}>2019</option>
                  <option value={2018}>2018</option>
                  <option value={2017}>2017</option>
                  <option value={2016}>2016</option>
                  <option value={2015}>2015</option>
                  <option value={2014}>2014</option>
                  <option value={2013}>2013</option>
                  <option value={2012}>2012</option>
                  <option value={2011}>2011</option>
                  <option value={2010}>2010</option>
                  <option value={2009}>2009</option>
                  <option value={2008}>2008</option>
                  <option value={2007}>2007</option>
                  <option value={2006}>2006</option>
                  <option value={2005}>2005</option>
                  <option value={2004}>2004</option>
                  <option value={2003}>2003</option>
                  <option value={2002}>2002</option>
                  <option value={2001}>2001</option>
                  <option value={2000}>2000</option>
                </select>
                </td>
            </tr> 
            <tr>
                <td class="text-left">Parcel ID:</td><td class="text-rightcell">{historicData.ParcelID}</td>
            </tr> 
            <tr>
                <td class="text-left">Property Address:</td><td class="text-rightcell">{historicData.Situs} </td>
            </tr> 
            <tr>
                <td class="text-left">Owner:</td><td class="text-rightcell">{historicData.Owner}</td>
            </tr> 
            <tr>
                <td class="text-left">Mailing Address:</td><td class="text-rightcell">{historicData.MailAddr} </td>
            </tr>  
            <tr>
                <td class="text-left">Total Appraisal:</td><td class="text-rightcell">{historicData.ApprValue}</td>
            </tr> 
            <tr>
                <td class="text-left">Improvement Appraisal:</td><td class="text-rightcell">{historicData.ApprLand} </td>
            </tr> 
            <tr>
                <td class="text-left">Land Appraisal:</td><td class="text-rightcell">{historicData.ApprImpr}</td>
            </tr> 
            <tr>
                <td class="text-left">Assessment:</td><td class="text-rightcell">{historicData.Assessed} </td>
            </tr> 
            <tr>
                <td class="text-left">Tax District</td><td class="text-rightcell">{historicData.TaxDist}</td>
            </tr> 
            <tr>
                <td class="text-left">Land Area:</td><td class="text-rightcell">{historicData.LandArea} acres </td>
            </tr> 
            <tr>
                <td class="text-left">Property Class:</td><td class="text-rightcell">{historicData.PropClass}</td>
            </tr> 
            <tr>
                <td class="text-left">Land Use Class:</td><td class="text-rightcell">{historicData.LandUse} </td>
            </tr> 
            <tr>
                <td class="text-left">TAD:</td><td class="text-rightcell">{profileData.TAD}</td>
            </tr> 
            <tr>
                <td class="text-left">CID:</td><td class="text-rightcell">{profileData.CID} </td>
            </tr> 
            <tr>
              <td colSpan={2}><a href={taxUrl} target='_blank'>Additional details from Board of Assessors</a></td>
            </tr>
          </table>
          </div>
        </div>
        <div class="box">
          <div class="header">Zoning</div>
          <div class="content">

          <table>       
            <tr>
                <td class="text-left">Zoning Class:</td><td class="text-rightcell">{profileData.ZoningClass}</td>
            </tr> 
            <tr>
                <td class="text-left">Overlay District:</td><td class="text-rightcell">{profileData .ZoningOvly}</td>
            </tr> 
            <tr>
                <td class="text-left">2035 Future Development:</td><td class="text-rightcell">{profileData.FutDev30}</td>
            </tr> 
          
            </table>
          </div>
        </div>
        <div class="box">
          <div class="header">Political</div>
          <div class="content">
          <table><tr>
                <td class="text-left">Muncipality:</td><td class="text-rightcell">{profileData.City}</td>
            </tr> 
            <tr>
                <td class="text-left">Commission District:</td><td class="text-rightcell">{profileData .CommDist}</td>
            </tr> 
            <tr>
                <td class="text-left">Commission Person:</td><td class="text-rightcell">{profileData.CommPerson}</td>
            </tr> 
            <tr>
                <td class="text-left">Council Dirstict:</td><td class="text-rightcell">{profileData.CounclName}</td>
            </tr>
            <tr>
                <td class="text-left">Council Person:</td><td class="text-rightcell">{profileData.CouncilPers}</td>
            </tr>
            <tr>
                <td class="text-left">Voting Precinct:</td><td class="text-rightcell">{profileData.VPrecinct}</td>
            </tr>
            <tr>
                <td class="text-left">Poll Location:</td><td class="text-rightcell">{profileData.VPoll}</td>
            </tr>
            <tr>
                <td class="text-left">Congressional District:</td><td class="text-rightcell">{profileData.CongDist}</td>
            </tr>
            <tr>
                <td class="text-left">State Senat Dirstict:</td><td class="text-rightcell">{profileData.SenateDist}</td>
            </tr>
            <tr>
                <td class="text-left">State House Dirstict:</td><td class="text-rightcell">{profileData.HouseDist}</td>
            </tr>
            </table>
          </div>
        </div>
        <div class="box">
          <div class="header">School Zones</div>
          <div class="content">
            <table>
              <tr>
                    <td class="text-left">Elementary School:</td><td class="text-rightcell">{profileData.ElementSch}</td>
                </tr>
                <tr>
                    <td class="text-left">Middle School:</td><td class="text-rightcell">{profileData.MiddleSch}</td>
                </tr>
                <tr>
                    <td class="text-left">High School:</td><td class="text-rightcell">{profileData.HighSch}</td>
                </tr>
              </table>
          </div>
        </div>
        <div class="box">
          <div class="header">Other Information</div>
          <div class="content">
          <table><tr>
                <td class="text-left">Zip Code:</td><td class="text-rightcell">{profileData.ZipCode}</td>
            </tr>
            <tr>
                <td class="text-left">Census Tract:</td><td class="text-rightcell">{profileData.Tract2010}</td>
            </tr>
            <tr>
                <td class="text-left">In Less Developed Census Tract:</td><td class="text-rightcell">{profileData.InLDCT}</td>
            </tr>
            </table>
          </div>
        </div>
      </div>   
  
    </div>  
    

      );
};

export default PropertyInfo;
