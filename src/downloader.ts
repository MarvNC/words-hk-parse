import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import axios from 'axios';

const domain = 'https://words.hk';
const requestURL = `${domain}/faiman/request_data/`;

/**
 * Download information result
 */
export interface DownloadResult {
  csvPaths: string[];
  outputDir: string;
}

/**
 * Downloads the latest CSV data from words.hk
 *
 * @param outputDir - The directory to save the CSV files (defaults to 'csvs')
 * @returns Promise resolving to paths of downloaded CSV files
 * @throws Error if download fails or expected files are not found
 */
export async function downloadLatest(
  outputDir: string = 'csvs'
): Promise<string[]> {
  console.log('Fetching CSRF token from words.hk...');
  const dom = await JSDOM.fromURL(requestURL);
  const { document } = dom.window;
  const csrfTokenInput = document.querySelector(
    'input[name=csrfmiddlewaretoken]'
  );
  if (!csrfTokenInput) {
    throw new Error('No csrf token found');
  }
  const csrfToken = (csrfTokenInput as HTMLInputElement).value;

  // Prepare request headers
  const myHeaders = new Headers();
  myHeaders.append('Cookie', `csrftoken=${csrfToken}`);
  myHeaders.append('Origin', domain);
  myHeaders.append('Referer', requestURL);
  const urlencoded = new URLSearchParams();
  urlencoded.append('csrfmiddlewaretoken', csrfToken);

  const requestOptions: RequestInit = {
    method: 'POST',
    headers: myHeaders,
    body: urlencoded,
    redirect: 'follow',
  };

  console.log('Requesting data export...');
  const response = await fetch(requestURL, requestOptions);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Response: ${response.status} ${response.statusText}`);
  }
  console.log('Request success, getting csv links...');
  const csvLinks = await getCSVLinks(new JSDOM(text));

  const downloadedPaths = await downloadCSVs(csvLinks, outputDir);
  console.log('Download complete.');

  return downloadedPaths;
}

/**
 * Extracts CSV download links from the response DOM
 *
 * @param dom - The JSDOM object containing the response page
 * @returns Promise resolving to array of CSV URLs
 * @throws Error if expected CSV links are not found
 */
async function getCSVLinks(dom: JSDOM): Promise<string[]> {
  const { document } = dom.window;

  const csvLinkAnchors = [
    ...document.querySelectorAll("a[href$='.csv.gz']"),
  ] as HTMLAnchorElement[];

  if (csvLinkAnchors.length !== 2) {
    throw new Error(
      `Expected 2 csv links, found ${csvLinkAnchors.length}`
    );
  }

  console.log('Found two csv links.');

  const csvLinks = csvLinkAnchors.map((a) => `${domain}${a.href}`);

  return csvLinks;
}

/**
 * Downloads and extracts CSV files from the given URLs
 *
 * @param csvLinks - Array of CSV URLs to download
 * @param csvDir - Directory to save the CSV files
 * @returns Promise resolving to paths of extracted CSV files
 */
async function downloadCSVs(
  csvLinks: string[],
  csvDir: string
): Promise<string[]> {
  // Create the directory if it doesn't exist
  if (!fs.existsSync(csvDir)) {
    fs.mkdirSync(csvDir, { recursive: true });
  }

  // Delete contents of the directory
  fs.readdirSync(csvDir).forEach((file) => {
    fs.unlinkSync(path.join(csvDir, file));
  });

  const extractedPaths: string[] = [];

  // Process each URL
  for (const url of csvLinks) {
    // Extract filename from URL
    const filename = path.basename(url);
    const fullPath = path.join(csvDir, filename);

    console.log(`Downloading ${filename} from ${url}...`);

    // Download the file from the URL to csvs directory
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
    });
    const buffer = Buffer.from(response.data);

    fs.writeFileSync(fullPath, buffer);

    // Unzip the downloaded file
    console.log(`Unzipping ${filename}...`);
    const csvFilename = filename.replace('.gz', '');
    const csvPath = path.join(csvDir, csvFilename);

    await new Promise<void>((resolve, reject) => {
      const gzip = zlib.createGunzip();
      const source = fs.createReadStream(fullPath);
      const destination = fs.createWriteStream(csvPath);

      source
        .pipe(gzip)
        .pipe(destination)
        .on('finish', () => {
          // Delete the .gz file
          fs.unlinkSync(fullPath);
          extractedPaths.push(csvPath);
          console.log(`Extracted ${csvFilename}`);
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  return extractedPaths;
}
