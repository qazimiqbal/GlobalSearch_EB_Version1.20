import React, { useEffect, useState, useRef } from 'react';

const PropertyInfo = ({ parcelID, myYear}) => {
    //console.log("Parcel ID = ",parcelID, " and Received myYear: ", myYear);
    const passedYear = myYear;
    
    
    //const [selectedYear, setSelectedYear] = useState(null);
    const [historicData, setHistoricData] = useState(null);
    const [profileData, setProfileData] = useState(null);
    const [error, setError] = useState(null);     
    const [selectedYear, setSelectedYear] = useState(2024); // Selected year for query
    //setSelectedYear(passedYear);
    //alert("Parcel ID = "+ parcelID + " Year = " + myYear);  
    
    console.log(" Passed Year = ", passedYear, " Parcel ID ", parcelID, " Selected year ", selectedYear);

    useEffect(() => {
      //alert("Year changed " +myYear);
       setSelectedYear(myYear); // This is the ONLY change needed!
    }, [myYear]); // Only depend on myYear

    useEffect(() => {
      //alert("ParcelID changed " + myYear);
      //setSelectedYear(myYear); // This is the ONLY change needed!
      const fetchHistoricData = async () => {
        //console.log("This Selected year = ",selectedYear)
          const queryUrl = `https://gismaps.fultoncountyga.gov/arcgispub/rest/services/Temp/GlobalSearch_Dialog/MapServer/2/query?f=json&where=ParcelID='${parcelID}' AND TaxYear=${selectedYear}&outFields=*`;
          //console.log(queryUrl);
          try {
          const response = await fetch(queryUrl);
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          
          const Historicdata = await response.json();

          //console.log("It  is in PropertyInfo line 19", Historicdata.features.length);
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
   }, [parcelID,  selectedYear]);

  const handleYearChange = (event) => {
    //console.log("Selected year = ",event.target.value);
    const changedYear = event.target.value;
    setSelectedYear(changedYear);
    alert("Wait.." );
    //setSelectedYear(Number(event.target.value));
    //setSelectedYear(parseInt(event.target.value)); // Update state with selected year
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
  //console.log("Parcel url = ",parcelUrl);
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
                      {[...Array(25)].map((_, i) => {
                        const year = 2024 - i;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
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
                  <td class="text-left">Total Appraisal:</td><td class="text-rightcell">
                    {historicData.ApprValue}
                    </td>
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
