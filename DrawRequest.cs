﻿using SkiaSharp;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace PainterPro
{
	public class DrawRequest
	{
		public string uuid = Guid.NewGuid().ToString().Replace("-", "").ToUpper(); // Generates a UUID 32 characters, containing a mix of digits and capital A-F letters.
		public string? payment = null; // Will be generated by swish servers when paid.
		public Dictionary<int, PixelRequest> pixels = new Dictionary<int, PixelRequest>();

		public DrawRequest(Dictionary<string, object> fields)
		{
			// Goes through all fields and adds them to corresponding PixelRequests.
			foreach (KeyValuePair<string, object> field in fields)
			{
				Match keyParts = Regex.Match(field.Key, @"^(?<index>\d*)(?<key>\w*)$");
				if (keyParts.Success && int.TryParse(keyParts.Groups["index"].Value, out int index))
				{
					string key = keyParts.Groups["key"].Value.ToLower();
					if (!pixels.ContainsKey(index))
					{
						pixels.Add(index, new PixelRequest());
					}
					pixels[index].Add(key, field.Value);
				}
			}
			foreach (KeyValuePair<int, PixelRequest> element in pixels.Where(element => !element.Value.IsComplete()).ToList()) // TODO: Find more elegant solution and handle non-colored pixels.
			{
				pixels.Remove(element.Key);
			}
		}

		public async Task<HttpResponseMessage?> CreatePaymentRequest()
		{
			// Creates a JSON response with all values in appsettings.json, as well as some new ones.
			Dictionary<string, object> contentFields = new Dictionary<string, object>(Util.appsettings)
			{
				{ "currency", "SEK" },
				{ "amount", "1" },
				{ "message", "David testar!" }
			};

			string contentString = JsonSerializer.Serialize(contentFields).ToString();
			StringContent content = new StringContent(contentString, Encoding.UTF8, "application/json");

			MyConsole.WriteData("	Sent data", contentString + " PUT " + Util.swishDomain + Util.swishCreatePath + uuid);

			HttpClient client = Util.GetSwishClient();
			try
			{
				Task<HttpResponseMessage> swishConnection = client.PutAsync(Util.swishCreatePath + uuid, content);
				return await swishConnection;
			}
			catch (Exception exception)
			{
				MyConsole.Write(exception.ToString());
				return null;
			}
		}

		public async Task<HttpResponseMessage?> GetPaymentQr(int size)
		{
			Dictionary<string, object> contentFields = new Dictionary<string, object>()
			{
				{ "token", uuid },
				{ "format", "png" },
				{ "size", size }
			};
			string contentString = JsonSerializer.Serialize(contentFields).ToString();
			StringContent content = new StringContent(contentString, Encoding.UTF8, "application/json");

			MyConsole.WriteData("	Sent data", contentString + " POST " + Util.swishDomain + Util.swishQrPath);

			HttpClient client = Util.GetSwishClient("https://mpc.getswish.net");
			try
			{
				Task<HttpResponseMessage> swishConnection = client.PostAsync(Util.swishQrPath, content);
				return await swishConnection;
			}
			catch (Exception exception)
			{
				MyConsole.Write(exception.ToString());
				return null;
			}
		}

		public void Draw()
		{
			if (pixels.Count > 0)
			{
				string path = Util.currentDirectory + "\\Website\\Assets\\painting.png";
				using (SKBitmap bitmap = SKBitmap.Decode(path))
				using (FileStream stream = File.OpenWrite(path))
				{
					foreach (PixelRequest pixel in pixels.Values)
					{
						bitmap.SetPixel((int)pixel.x, (int)pixel.y, SKColor.Parse(pixel.color));
					}
					SKImage image = SKImage.FromBitmap(bitmap);
					SKData data = image.Encode();
					data.SaveTo(stream);
				}
			}
		}

		public class PixelRequest
		{
			public int? x;
			public int? y;
			public string? color;

			public void Add(string key, object value)
			{
				switch (key)
				{
					case "color":
						color = value.ToString();
						break;
					case "x":
					case "y":
						int valueInt;
						if (value.GetType() == typeof(string))
						{
							if (!int.TryParse((string)value, out valueInt))
							{
								break;
							}
						}
						else
						{
							valueInt = (int)value;
						}
						switch (key)
						{
							case "x":
								x = valueInt;
								break;
							case "y":
								y = valueInt;
								break;
						}
						break;
				}
			}

			public bool IsComplete()
			{
				return x != null && y != null && color != null;
			}
		}
	}
}