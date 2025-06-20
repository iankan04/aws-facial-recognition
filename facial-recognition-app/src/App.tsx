import { useState, useRef } from 'react'
import './App.css'
import { v4 as uuidv4} from 'uuid';
import { Camera } from "react-camera-pro";
import Loader from "./components/Loader.tsx";

const visitorBucket = 'iank-visitor-image-storage';

function App() {
  const [image, setImage] = useState<File | null>(null);
  const [uploadResultMessage, setUploadResultMessage] = useState<string>();
  const [isAuth, setAuth] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const camera = useRef<InstanceType<typeof Camera>>(null);

  const dataURLtoBlob = (dataURL : string): Blob => {
    const arr = dataURL.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  const sendImage = async (e : React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const visitorImageName = uuidv4();

    if (!image) {
      setUploadResultMessage("Please uplad an image to authenticate.");
      return;
    }

    try {
      await fetch(`https://qqyhjni9kh.execute-api.us-east-1.amazonaws.com/dev/${visitorBucket}/${visitorImageName}.png`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/png'
        },
        body: image        
      });
      
      const authResponse = await authenticate(visitorImageName);

      setLoading(false);
      if (authResponse.Message === 'Success') {
        setAuth(true);
        setUploadResultMessage(`Hi ${authResponse.firstName} ${authResponse.lastName}, welcome to work. Hope you have a productive day today!`);
      } else {
        setAuth(false);
        setUploadResultMessage('Authentification Failed: this person is not an employee');
      }
    } catch (error) {
      setUploadResultMessage("An error occurred during upload and authenication process. Please try again.");
      console.error(error);
    }
  }

  const authenticate = async (visitorImageName : string) => {
    const requestUrl = 'https://qqyhjni9kh.execute-api.us-east-1.amazonaws.com/dev/employee?' + new URLSearchParams({
      objectKey: `${visitorImageName}.png`
    });
    try {
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error(error);
      return { message: 'Error' };
    } 
  }

  return (
    <>
      <div className='App'>
        <h2>Ian's Facial Recognition System</h2>
        <form onSubmit={sendImage} className='form'>
          <input 
            type="file" 
            name="image" 
            onChange={ e => {
              if (e.target.files) {
                setImage(e.target.files[0]);
                setUploadResultMessage(undefined);
              }
            }} 
          />
          <button type='submit' onClick={() => {
            if (!image && camera.current) {
              const photoBlob = dataURLtoBlob(camera.current.takePhoto());
              const photoFile = new File([photoBlob], "visitor.png", { type: 'image/png' });
              setImage(photoFile);
            }
            setLoading(true);
          }}>Authenticate</button>
        </form>
        <hr className='border-slate-200'/>
        <div className="img-frame">
          { loading ? (<Loader />) :
          !image ? (
            <Camera ref={camera} aspectRatio={ 16 / 9 } className="camera"/>
          ) : (
            <img 
              src={image ? URL.createObjectURL(image) : undefined } 
              alt='Visitor'
              style={{ transform: 'scaleX(-1)' }}
            />
          )}
        </div>
        {!loading && (<div className={isAuth ? 'success' : 'failure'}>{uploadResultMessage} </div>)}
      </div>
    </>
  )
}

export default App
