using SkiaSharp;
using System.Drawing;
using System.Text.RegularExpressions;

public class DrawRequest
{
	public string phone;
	public Dictionary<int, PixelRequest> pixels = new Dictionary<int, PixelRequest>();
	public DrawRequest(string phone, Dictionary<string, string> fields)
	{
		this.phone = phone;

		// Goes through all fields and adds them to corresponding PixelRequests.
		foreach (KeyValuePair<string, string> field in fields)
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
		foreach (KeyValuePair<int, PixelRequest> element in pixels.Where(element => !element.Value.IsComplete()).ToList()) // TODO: Find more elegant solution.
		{
			pixels.Remove(element.Key);
		}
	}

	public void Draw()
	{
		if (pixels.Count > 0)
		{
			string path = PainterPro.Website.currentDirectory + "\\Website\\Assets\\painting.png";
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

		public void Add(string key, string valueString)
		{
			if (key == "color")
			{
				color = valueString;
			}
			else if (int.TryParse(valueString, out int value))
			{
				switch (key)
				{
					case "x":
						x = value;
						break;
					case "y":
						y = value;
						break;
				}
			}
		}

		public bool IsComplete()
		{
			return x != null && y != null && color != null;
		}
	}
}
